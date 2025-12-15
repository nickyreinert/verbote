export const state = {
    chartPartiesInstance: null,
    chartModelsInstance: null,
    chartTrendInstance: null,
    chartMethodologyInstance: null,
    chartStrictnessInstance: null,
    chartTopicDistributionInstance: null,
    chartConsensusInstance: null,
    chartProximityInstance: null,
    
    globalConfig: null,
    globalDistributionData: null,
    globalConsensusData: null,
    allPartiesSet: new Set(),
    currentFilterMode: 'all',
    
    dataCache: {},
    loadingPromises: {},
    
    currentDetailData: [],
    currentTopicData: [],
    currentPartiesTableData: [],
    currentPartiesSort: { column: 'party', direction: 'asc' },
    currentPartiesTableFilter: null // { party, category, year }
};
