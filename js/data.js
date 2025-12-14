import { state } from './state.js';
import { updatePartyColors } from './utils.js';

export function loadColors() {
    return fetch('colors.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(colors => {
            updatePartyColors(colors);
            return colors;
        })
        .catch(error => console.error('Error loading colors.json:', error));
}

export function loadConfig() {
    return fetch('config.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(config => {
            state.globalConfig = config;
            return config;
        })
        .catch(error => console.error('Error loading config.json:', error));
}

export function loadDistributionData() {
    return fetch('distribution_analysis.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            state.globalDistributionData = data;
            return data;
        })
        .catch(error => console.error('Error loading distribution_analysis.json:', error));
}

export function loadConsensusData() {
    return fetch('consensus_analysis.json?v=' + new Date().getTime())
        .then(response => response.json())
        .then(data => {
            state.globalConsensusData = data;
            return data;
        })
        .catch(error => console.error('Error loading consensus_analysis.json:', error));
}

export async function loadDataForModel(modelName, year) {
    // Check if already loaded for this year
    if (state.dataCache[modelName] && state.dataCache[modelName][year]) {
        console.log(`Data for ${modelName}/${year} already in cache.`);
        return;
    }

    const cacheKey = `${modelName}-${year}`;
    if (state.loadingPromises[cacheKey]) return state.loadingPromises[cacheKey];

    console.log(`Loading data for ${modelName}/${year}...`);
    state.loadingPromises[cacheKey] = (async () => {
        if (!state.dataCache[modelName]) state.dataCache[modelName] = {};
        
        const yearConfig = state.globalConfig[year];
        if (!yearConfig || !yearConfig[modelName]) {
            console.warn(`No config found for ${modelName}/${year}`);
            return;
        }

        const partyConfigs = yearConfig[modelName];
        state.dataCache[modelName][year] = {};

        const promises = partyConfigs.map(partyConfig => {
            console.log(`Fetching ${partyConfig.file}...`);
            return fetch(partyConfig.file)
                .then(res => {
                    if (!res.ok) throw new Error(`Failed to load ${partyConfig.file}: ${res.statusText}`);
                    return res.text().then(text => {
                        try {
                            return text ? JSON.parse(text) : {};
                        } catch (e) {
                            console.warn(`Invalid JSON in ${partyConfig.file}`, e);
                            return {};
                        }
                    });
                })
                .then(data => {
                    const topics = data.topics || [];
                    topics.forEach(t => t.sourceFile = partyConfig.original_file);
                    
                    return {
                        year: year,
                        partyName: partyConfig.party,
                        topics: topics,
                        semanticCount: topics.filter(t => t.category && t.category.toLowerCase().includes('semantisch')).length,
                        explicitCount: topics.filter(t => t.category && t.category.toLowerCase().includes('explizit')).length
                    };
                })
                .catch(err => {
                    console.error(err);
                    return null;
                });
        });

        const results = await Promise.all(promises);
        console.log(`Loaded ${results.length} results for ${modelName}/${year}`);
        
        results.forEach(res => {
            if (res) {
                state.dataCache[modelName][year][res.partyName] = res;
            }
        });
    })();

    try {
        await state.loadingPromises[cacheKey];
    } finally {
        delete state.loadingPromises[cacheKey];
    }
}

export function analyzeParties() {
    state.allPartiesSet = new Set();
    for (const year in state.globalConfig) {
        const yearData = state.globalConfig[year];
        for (const model in yearData) {
            const partyList = yearData[model];
            if (Array.isArray(partyList)) {
                partyList.forEach(entry => {
                    if (entry.party) {
                        state.allPartiesSet.add(entry.party);
                    }
                });
            }
        }
    }
}
