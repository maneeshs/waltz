import settingsStore from "./services/settings-store";
import hierarchiesStore from "./services/hierarchies-store";
import hasSetting from "./directives/has-setting";

export default (module) => {
    module
        .service('SettingsStore', settingsStore)
        .service('HierarchiesStore', hierarchiesStore);

    module
        .directive('waltzHasSetting', hasSetting);

    module
        .config(require('./routes'));
};