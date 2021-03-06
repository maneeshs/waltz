/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016, 2017  Waltz open source project
 * See README.md for more information
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 */

import _ from 'lodash';
import { nest } from "d3-collection";
import { CORE_API } from '../../../common/services/core-api-utils';
import { initialiseData } from '../../../common';
import { sameRef } from '../../../common/entity-utils';
import { invokeFunction } from '../../../common/index';
import { downloadTextFile } from '../../../common/file-utils';


import template from './bulk-physical-flow-parser.html';


const bindings = {
    columnMappings: '<',
    sourceData: '<',

    onInitialise: '<',
    onParseComplete: '<'
};


const initialState = {
    columnDefs: [],
    columnMappings: {},
    filterCriteria: null,
    filteredData: [],
    loading: false,
    parsedData: [],
    sourceData: [],
    summary: {},

    onInitialise: (event) => console.log('default onInitialise handler for bulk-physical-flow-parser: ', event),
    onParseComplete: (event) => console.log('default onParseComplete handler for bulk-physical-flow-parser: ', event)
};



function mkEntityLinkColumnDef(columnHeading, entityRefField) {
    return {
        field: entityRefField + '.name',
        displayName: columnHeading,
        cellTemplate: `
            <div class="ui-grid-cell-contents">
                <waltz-entity-link ng-if="row.entity.parsedFlow.${entityRefField}"
                                   entity-ref="row.entity.parsedFlow.${entityRefField}">
                </waltz-entity-link>
                <span ng-if="row.entity.errors.${entityRefField}"
                      class="text-danger bg-danger">
                    <strong ng-bind="row.entity.errors.${entityRefField}"></strong>
                </span>
            </div>`
    };
}


function mkColumnDef(columnHeading, entityRefField) {
    return {
        field: entityRefField,
        displayName: columnHeading,
        cellTemplate: `
            <div class="ui-grid-cell-contents">
                <span ng-if="row.entity.parsedFlow.${entityRefField}"
                      ng-bind="row.entity.parsedFlow.${entityRefField}">
                </span>
                <span ng-if="row.entity.errors.${entityRefField}"
                      class="text-danger bg-danger">
                    <strong ng-bind="row.entity.errors.${entityRefField}"></strong>
                </span>
            </div>`
    };
}


function mkColumnDefs() {
    return [
        mkEntityLinkColumnDef('Source', 'source'),
        mkEntityLinkColumnDef('Target', 'target'),
        Object.assign({}, mkColumnDef('Name', 'name'), {width: '30%'}),
        mkColumnDef('Format', 'format'),
        mkColumnDef('Frequency', 'frequency'),
        mkColumnDef('Basis Offset', 'basisOffset'),
        mkColumnDef('Transport', 'transport'),
        mkColumnDef('Criticality', 'criticality'),
        mkColumnDef('External ID', 'externalId'),
        {
            field: 'entityReference',
            displayName: '',
            width: '5%',
            cellTemplate: `
                <div class="ui-grid-cell-contents" 
                     ng-if="!row.entity.hasParseErrors">
                    <span ng-if="COL_FIELD === null"
                          class="label label-success">New</span>
                    <a ng-if="COL_FIELD"
                       ui-sref="main.physical-flow.view ({ id:COL_FIELD.id })"
                       class="label label-warning">Exists</a>
                </div>`
        }
    ];
}


function mapColumns(columnMappings = {}, sourceData = []) {
    const sourceKeys = _.keys(columnMappings);
    const mappedObjects = _.map(sourceData, sourceObj => {
        const targetObj = {};

        _.forEach(sourceKeys, sourceColumn => {
            const targetColumn = columnMappings[sourceColumn].name;
            targetObj[targetColumn] = sourceObj[sourceColumn];
        });

        targetObj['owner'] = targetObj['owner'] || targetObj['source'];
        targetObj['description'] = targetObj['description'] || '';
        return targetObj;
    });
    return mappedObjects;
}


function mkParseSummary(data = []) {
    const summary = Object.assign(
        {
            total: data.length,
            newFlows: 0,
            existingFlows: 0,
            missingEntities: parseErrorCount(data),
            circularFlows: 0,
            nonCircularFlows: data.length
        },
        _.countBy(data, r => r.outcome === 'SUCCESS' && r.entityReference !== null ? 'newFlows' : 'existingFlows'),
        _.countBy(data, r => r.parsedFlow.source && r.parsedFlow.target && sameRef(r.parsedFlow.source, r.parsedFlow.target) ? 'circularFlows' : 'nonCircularFlows'));

    summary.errors = summary.missingEntities + summary.circularFlows;
    return summary;
}


function mkFilterPredicate(criteria) {
    switch (criteria) {
        case 'ERROR':
            return (r) => r.outcome === 'FAILURE';
        case 'NEW':
            return (r) => r.outcome === 'SUCCESS' && r.entityReference === null;
        case 'EXISTING':
            return (r) => r.outcome === 'SUCCESS' && r.entityReference !== null;
        default:
            return (r) => true;
    }
}


function parseErrorCount(data = []) {
    return  _.sumBy(data, f => _.chain(f.errors)
        .keys()
        .filter(k => k !== 'owner')
        .value()
        .length);
}


function controller($scope, serviceBroker) {
    const vm = initialiseData(this, initialState);

    vm.columnDefs = mkColumnDefs();

    const isComplete = () => {
        return parseErrorCount(vm.parsedData) === 0;
    };

    const filterResults = (criteria) => {
        vm.filterCriteria = criteria;
        return _.filter(vm.parsedData, mkFilterPredicate(criteria));
    };

    const resolveFlows = async () => {
        if(vm.columnMappings && vm.sourceData) {
            const mappedData = mapColumns(vm.columnMappings, vm.sourceData, vm.columnResolvers);

            const parsedData = await serviceBroker
                .execute(CORE_API.PhysicalFlowStore.validateUpload, [mappedData])
                .then(r => r.data);

            return parsedData;
        }
    };

    const parseFlows = () => {
        vm.loading = true;
        return resolveFlows()
            .then(flows => {
                const hasParseErrors = _.some(flows, f => f.outcome === 'FAILURE');
                vm.parsedData = _.map(flows, f => Object.assign({}, f, { hasParseErrors }));
                vm.filteredData = filterResults();
                vm.summary = mkParseSummary(vm.parsedData);
                $scope.$apply(() => vm.loading = false);

                const event = {
                    data: vm.parsedData,
                    isComplete
                };
                invokeFunction(vm.onParseComplete, event);
            })
            .catch(err => console.error('error resolving flows: ', err));
    };

    vm.$onInit = () => {
        const api = {
            parseFlows
        };
        invokeFunction(vm.onInitialise, api);
    };


    vm.$onChanges =(changes) => {
    };


    vm.applyFilter = (criteria) => {
        vm.filteredData = filterResults(criteria);
    };


    vm.exportParseErrors = () => {

        const getPropertyOrError = (obj, property, errorProperty) => {
            return _.get(obj.parsedFlow, property)
                || _.get(obj.errors, errorProperty || property);
        };

        const header = [
            "Source",
            "Target",
            "Name",
            "Format",
            "Frequency",
            "Basis Offset",
            "Transport",
            "Criticality",
            "External ID",
        ];

        const dataRows = _
            .chain(vm.filteredData)
            .filter(mkFilterPredicate('ERROR'))
            .map(flow => {
                return [
                    getPropertyOrError(flow, 'source.name', 'source'),
                    getPropertyOrError(flow, 'target.name', 'target'),
                    getPropertyOrError(flow, 'name'),
                    getPropertyOrError(flow, 'format'),
                    getPropertyOrError(flow, 'frequency'),
                    getPropertyOrError(flow, 'basisOffset'),
                    getPropertyOrError(flow, 'transport'),
                    getPropertyOrError(flow, 'criticality'),
                    getPropertyOrError(flow, 'externalId')
                ];
            })
            .value();

        const rows = [header]
            .concat(dataRows);

        downloadTextFile(rows, ",", `physical_flow_errors.csv`);
    };
}


controller.$inject = [
    '$scope',
    'ServiceBroker'
];


const component = {
    template,
    bindings,
    controller
};


export default {
    component,
    id: 'waltzBulkPhysicalFlowParser'
};
