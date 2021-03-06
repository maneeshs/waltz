/*
 * Waltz - Enterprise Architecture
 * Copyright (C) 2016, 2017 Waltz open source project
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

package com.khartec.waltz.jobs;

import com.khartec.waltz.model.*;
import com.khartec.waltz.model.software_catalog.SoftwareSummaryStatistics;
import com.khartec.waltz.service.DIConfiguration;
import com.khartec.waltz.service.software_catalog.SoftwareCatalogService;
import org.jooq.DSLContext;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;


public class SoftwareCatalogHarness {

    public static void main(String[] args) {
        AnnotationConfigApplicationContext ctx = new AnnotationConfigApplicationContext(DIConfiguration.class);
        SoftwareCatalogService softwareCatalogService = ctx.getBean(SoftwareCatalogService.class);
        DSLContext dsl = ctx.getBean(DSLContext.class);


        EntityReference ref = ImmutableEntityReference.builder()
                .kind(EntityKind.ORG_UNIT)
                .id(20L)
                .build();


        IdSelectionOptions options = ImmutableIdSelectionOptions.builder()
                .entityReference(ref)
                .scope(HierarchyQueryScope.CHILDREN)
                .build();

        SoftwareSummaryStatistics stats = softwareCatalogService.findStatisticsForAppIdSelector(options);
        System.out.println("stats:"+stats);
    }




}
