import { state } from './state.js';
import { loadConfig, loadColors, loadDistributionData, loadConsensusData, loadDataForModel, analyzeParties } from './data.js';
import { 
    populateYearSelect, populateYearSelectModels, populateModelSelect, populateModelSelectTopics, populatePartySelect, 
    populateMethodologyYearSelect, populateConsensusYearSelect, populateYearSelectTopics, renderPartiesTable, renderTable, 
    showDetails, renderWordCloud, showTopicDetails, renderTopicTable 
} from './ui.js';
import { 
    renderStrictnessChart, renderMethodologyChart, updatePartiesChart, updateTrendChart, 
    updateModelsChart, renderTopicDistributionChart, renderTopicStackedChart 
} from './charts.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM Elements ---
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.view-section');
    
    const selectModel = document.getElementById('select-model');
    const selectYear = document.getElementById('select-year');
    const selectParty = document.getElementById('select-party');
    const selectYearModels = document.getElementById('select-year-models');
    const selectYearTopics = document.getElementById('select-year-topics');
    const selectModelTopics = document.getElementById('select-model-topics');
    const searchPartiesInput = document.getElementById('search-parties-input');
    const partiesTableHeaders = document.querySelectorAll('#parties-table th.sortable');
    const filterSelects = document.querySelectorAll('.filter-mode-select');
    const searchInput = document.getElementById('search-input');
    const searchTopicInput = document.getElementById('search-topic-input');
    const detailsSection = document.getElementById('details-section');

    // --- Initialization ---
    
    // Navigation Logic
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Update Nav UI
            navLinks.forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            
            // Show Target Section
            const targetId = link.getAttribute('data-target');
            sections.forEach(section => {
                if (section.id === targetId) {
                    section.classList.remove('hidden');
                } else {
                    section.classList.add('hidden');
                }
            });

            // Hide details when switching views
            detailsSection.classList.add('hidden');
        });
    });

    // Load Config
    Promise.all([loadConfig(), loadColors()])
        .then(() => preloadAllModelData())
        .then(() => {
            initApp();
            return Promise.all([loadDistributionData(), loadConsensusData()]);
        })
        .then(([distributionData, consensusData]) => {
            populateMethodologyYearSelect(distributionData);
            renderMethodologyChart(distributionData);
            renderStrictnessChart('all');
            populateConsensusYearSelect(consensusData);
        })
        .catch(err => console.error('Error during initialization:', err));

    async function preloadAllModelData() {
        if (!state.globalConfig) {
            console.warn('Global config missing, skipping preload.');
            return;
        }

        const preloadPromises = [];
        Object.keys(state.globalConfig).forEach(year => {
            Object.keys(state.globalConfig[year]).forEach(model => {
                preloadPromises.push(loadDataForModel(model, year));
            });
        });

        await Promise.all(preloadPromises);
    }

    function initApp() {
        console.log('Initializing App...');
        const years = Object.keys(state.globalConfig).sort((a, b) => b - a);
        console.log('Years found:', years);

        // 1. Populate Year Select (View 1)
        populateYearSelect(years);
        populateYearSelectModels(years);
        populateYearSelectTopics(years);
        
        // Populate Model Select with ALL models
        const allModels = new Set();
        Object.keys(state.globalConfig).forEach(y => {
            Object.keys(state.globalConfig[y]).forEach(m => allModels.add(m));
        });
        const sortedModels = Array.from(allModels).sort();
        populateModelSelect(sortedModels);
        populateModelSelectTopics(sortedModels);
        
        // 2. Analyze Config to find all unique parties (View 2)
        analyzeParties();
        populatePartySelect();
        
        // 3. Populate Methodology
                
        // 4. Setup Event Listeners
        selectModel.addEventListener('change', handleModelChange);
        selectYear.addEventListener('change', (e) => {
            handleYearChange(e);
            // updateMethodologyChart(); // This was in original code but methodology chart has its own year selector
        });
        selectParty.addEventListener('change', (e) => updateModelsView(e.target.value, selectYearModels.value));
        selectYearModels.addEventListener('change', (e) => updateModelsView(selectParty.value, e.target.value));
        selectYearTopics.addEventListener('change', handleTopicsYearChange);
        selectModelTopics.addEventListener('change', handleTopicsYearChange); // Reuse handler
        searchTopicInput.addEventListener('input', handleTopicSearch);
        
        // Section 1 Table Listeners
        searchPartiesInput.addEventListener('input', handlePartiesSearch);
        partiesTableHeaders.forEach(th => {
            th.addEventListener('click', () => {
                const column = th.getAttribute('data-sort');
                handlePartiesSort(column);
            });
        });

        // Filter Listeners
        filterSelects.forEach(select => {
            select.addEventListener('change', (e) => {
                state.currentFilterMode = e.target.value;
                // Sync all filter dropdowns
                filterSelects.forEach(s => s.value = state.currentFilterMode);
                
                // Update all views
                handleFilterChange();
            });
        });

        // Initial load for topics (all years)
        updateTopicsView('all', 'all');
        searchInput.addEventListener('input', handleSearch);

        // Listen for parties table filter events from chart clicks
        window.addEventListener('filterPartiesTable', (e) => {
            handlePartiesTableFilter(e.detail);
        });

        // Initial load: Do NOT auto-select. User must choose.
        // The UI functions (populateYearSelect, etc.) already set the default option to "Bitte wählen..."
    }

    function handleModelChange(e) {
        const modelName = selectModel.value;
        let year = selectYear.value;
        console.log(`handleModelChange called. Model=${modelName}, Year=${year}`);
        
        if (!modelName || !year) return;

        // Auto-switch to latest valid year if model not in current year
        if (!state.globalConfig[year] || !state.globalConfig[year][modelName]) {
            const allYears = Object.keys(state.globalConfig).sort((a, b) => b - a);
            const validYear = allYears.find(y => state.globalConfig[y][modelName]);
            if (validYear) {
                console.log(`Auto-switching year from ${year} to ${validYear} for model ${modelName}`);
                year = validYear;
                selectYear.value = year;
            } else {
                console.warn(`No valid year found for model ${modelName}`);
            }
        }
        
        loadDataForModel(modelName, year).then(() => {
            console.log('Data loaded, updating view...');
            updatePartiesView(modelName, year);
        });
    }

    function handleYearChange(e) {
        const year = selectYear.value;
        if (!year) return;

        // Check if current model is valid for this year
        let currentModel = selectModel.value;
        if (!state.globalConfig[year] || !state.globalConfig[year][currentModel]) {
            const modelsInYear = Object.keys(state.globalConfig[year] || {});
            if (modelsInYear.length > 0) {
                currentModel = modelsInYear[0];
                selectModel.value = currentModel;
            } else {
                currentModel = null;
                selectModel.value = "";
            }
        }

        if (currentModel) {
            loadDataForModel(currentModel, year).then(() => {
                updatePartiesView(currentModel, year);
            });
        }
    }

    function handleSearch(e) {
        const term = e.target.value.toLowerCase();
        const filteredItems = state.currentDetailData.filter(item => {
            return (
                (item.category && item.category.toLowerCase().includes(term)) ||
                (item.topic && item.topic.toLowerCase().includes(term)) ||
                (item.originalQuote && item.originalQuote.toLowerCase().includes(term))
            );
        });
        renderTable(filteredItems);
    }

    function handleFilterChange() {
        // View 1
        if (selectModel.value && selectYear.value) {
            updatePartiesView(selectModel.value, selectYear.value);
        }
        
        // View 2
        if (selectParty.value) {
            updateModelsView(selectParty.value, selectYearModels.value);
        }

        // View 3
        updateTopicsView(selectYearTopics.value, selectModelTopics.value);

        // View 4
        // updateMethodologyChart(); // Handled by its own filter
    }

    function updatePartiesView(modelName, year) {
        console.log(`updatePartiesView called for ${modelName}/${year}`);
        if (!state.dataCache[modelName] || !state.dataCache[modelName][year]) {
            console.warn(`No data found in cache for ${modelName}/${year} inside updatePartiesView`);
            return;
        }

        // 1. Bar Chart (Specific Year)
        const yearData = state.dataCache[modelName][year];
        if (yearData) {
            const labels = Object.keys(yearData);
            console.log(`Found ${labels.length} parties for chart.`);
            let semanticCounts = labels.map(p => yearData[p].semanticCount);
            const explicitCounts = labels.map(p => yearData[p].explicitCount);

            if (state.currentFilterMode === 'explicit') {
                semanticCounts = semanticCounts.map(() => 0);
            }

            updatePartiesChart(labels, semanticCounts, explicitCounts, modelName, year);
        } else {
            // Clear chart if no data for year
            if (state.chartPartiesInstance) state.chartPartiesInstance.destroy();
        }

        // 2. Trend Chart (All Years)
        updateTrendChart(modelName);

        // 3. Update Table
        updatePartiesTable(modelName, year);
    }

    function updatePartiesTable(modelName, year) {
        const yearData = state.dataCache[modelName][year];
        if (!yearData) return;

        let allTopics = [];
        Object.keys(yearData).forEach(party => {
            const pData = yearData[party];
            if (pData.topics) {
                pData.topics.forEach(t => {
                    allTopics.push({ ...t, party: party });
                });
            }
        });

        if (state.currentFilterMode === 'explicit') {
            allTopics = allTopics.filter(t => t.category && t.category.toLowerCase().includes('explizit'));
        }

        state.currentPartiesTableData = allTopics;
        
        // Reset chart filter when changing model/year
        state.currentPartiesTableFilter = null;
        
        renderPartiesTable(state.currentPartiesTableData);
    }

    function handlePartiesTableFilter(filter) {
        if (!filter) {
            // Reset filter - show all data
            const term = searchPartiesInput.value.toLowerCase();
            if (term) {
                handlePartiesSearch({ target: { value: term } });
            } else {
                renderPartiesTable(state.currentPartiesTableData);
            }
            return;
        }

        // Apply filter based on party, category, and year
        const { party, category, year } = filter;
        
        let filteredItems = state.currentPartiesTableData.filter(item => {
            // Filter by party
            if (party && item.party !== party) return false;
            
            // Filter by category (explicit vs semantic)
            if (category === 'explizit') {
                if (!item.category || !item.category.toLowerCase().includes('explizit')) return false;
            } else if (category === 'semantisch') {
                if (item.category && item.category.toLowerCase().includes('explizit')) return false;
            }
            
            return true;
        });

        // Also apply search term if present
        const term = searchPartiesInput.value.toLowerCase();
        if (term) {
            filteredItems = filteredItems.filter(item => {
                return (
                    (item.party && item.party.toLowerCase().includes(term)) ||
                    (item.category && item.category.toLowerCase().includes(term)) ||
                    (item.topic && item.topic.toLowerCase().includes(term)) ||
                    (item.originalQuote && item.originalQuote.toLowerCase().includes(term))
                );
            });
        }

        renderPartiesTable(filteredItems);
    }

    function handlePartiesSearch(e) {
        const term = e.target.value.toLowerCase();
        
        let baseData = state.currentPartiesTableData;
        
        // Apply chart filter if active
        if (state.currentPartiesTableFilter) {
            const { party, category } = state.currentPartiesTableFilter;
            baseData = baseData.filter(item => {
                if (party && item.party !== party) return false;
                if (category === 'explizit') {
                    if (!item.category || !item.category.toLowerCase().includes('explizit')) return false;
                } else if (category === 'semantisch') {
                    if (item.category && item.category.toLowerCase().includes('explizit')) return false;
                }
                return true;
            });
        }
        
        const filteredItems = baseData.filter(item => {
            return (
                (item.party && item.party.toLowerCase().includes(term)) ||
                (item.category && item.category.toLowerCase().includes(term)) ||
                (item.topic && item.topic.toLowerCase().includes(term)) ||
                (item.originalQuote && item.originalQuote.toLowerCase().includes(term))
            );
        });
        renderPartiesTable(filteredItems);
    }

    function handlePartiesSort(column) {
        if (state.currentPartiesSort.column === column) {
            state.currentPartiesSort.direction = state.currentPartiesSort.direction === 'asc' ? 'desc' : 'asc';
        } else {
            state.currentPartiesSort.column = column;
            state.currentPartiesSort.direction = 'asc';
        }
        
        // Update sort icons
        partiesTableHeaders.forEach(th => {
            const span = th.querySelector('.sort-icon') || th;
            if (th.getAttribute('data-sort') === column) {
                th.textContent = th.textContent.replace(/[↕↑↓]/, '') + (state.currentPartiesSort.direction === 'asc' ? ' ↑' : ' ↓');
            } else {
                th.textContent = th.textContent.replace(/[↕↑↓]/, '') + ' ↕';
            }
        });

        // Re-render with current search term if any
        const term = searchPartiesInput.value.toLowerCase();
        if (term) {
            handlePartiesSearch({ target: { value: term } });
        } else {
            renderPartiesTable(state.currentPartiesTableData);
        }
    }

    async function updateModelsView(partyName, selectedYear) {
        if (!partyName) return;

        // Load data for all models across all years
        const years = Object.keys(state.globalConfig);
        const loadPromises = [];
        const allModels = new Set();

        years.forEach(year => {
            if (selectedYear && selectedYear !== 'all' && year !== selectedYear) return;
            Object.keys(state.globalConfig[year]).forEach(model => {
                allModels.add(model);
                loadPromises.push(loadDataForModel(model, year));
            });
        });

        await Promise.all(loadPromises);

        const labels = [];
        const semanticCounts = [];
        const explicitCounts = [];
        const detailDataMap = {}; 

        allModels.forEach((modelKey) => {
            let totalSemantic = 0;
            let totalExplicit = 0;
            let allTopics = [];
            let hasData = false;

            // Iterate all years for this model
            const modelData = state.dataCache[modelKey];
            if (modelData) {
                for (const year in modelData) {
                    if (selectedYear && selectedYear !== 'all' && year !== selectedYear) continue;
                    if (modelData[year][partyName]) {
                        hasData = true;
                        totalSemantic += modelData[year][partyName].semanticCount;
                        totalExplicit += modelData[year][partyName].explicitCount;
                        
                        let topics = modelData[year][partyName].topics;
                        if (state.currentFilterMode === 'explicit') {
                            topics = topics.filter(t => t.category && t.category.toLowerCase().includes('explizit'));
                        }
                        allTopics = allTopics.concat(topics);
                    }
                }
            }

            if (hasData) {
                labels.push(modelKey);
                semanticCounts.push(totalSemantic);
                explicitCounts.push(totalExplicit);
                detailDataMap[modelKey] = allTopics;
            }
        });
        
        if (state.currentFilterMode === 'explicit') {
            for(let i=0; i<semanticCounts.length; i++) semanticCounts[i] = 0;
        }

        updateModelsChart(labels, semanticCounts, explicitCounts, partyName, detailDataMap, selectedYear);
        detailsSection.classList.add('hidden');
    }

    async function handleTopicsYearChange(e) {
        const year = selectYearTopics.value;
        const model = selectModelTopics.value;
        updateTopicsView(year, model);
    }

    async function updateTopicsView(year, model) {
        const yearsToLoad = year === 'all' ? Object.keys(state.globalConfig) : [year];
        const loadPromises = [];
        
        yearsToLoad.forEach(y => {
            const models = Object.keys(state.globalConfig[y] || {});
            models.forEach(m => {
                if (model === 'all' || m === model) {
                    loadPromises.push(loadDataForModel(m, y));
                }
            });
        });

        await Promise.all(loadPromises);

        const topicCounts = {}; 
        const partyTopicCounts = {}; // { party: { topic: count } }

        yearsToLoad.forEach(y => {
            const models = Object.keys(state.globalConfig[y] || {});
            models.forEach(modelKey => {
                if (model !== 'all' && modelKey !== model) return;

                const modelData = state.dataCache[modelKey];
                if (!modelData || !modelData[y]) return;

                const yearData = modelData[y];
                Object.keys(yearData).forEach(party => {
                    const partyData = yearData[party];
                    if (partyData && partyData.topics) {
                        partyData.topics.forEach(topic => {
                            if (state.currentFilterMode === 'explicit' && (!topic.category || !topic.category.toLowerCase().includes('explizit'))) {
                                return;
                            }

                            const classification = topic.classification || 'SONSTIGES';
                            
                            // Global counts for Word Cloud
                            if (!topicCounts[classification]) {
                                topicCounts[classification] = { count: 0, items: [] };
                            }
                            topicCounts[classification].count++;
                            topicCounts[classification].items.push({
                                ...topic,
                                party: party,
                                model: modelKey,
                                year: y
                            });

                            // Party counts for Stacked Bar
                            if (!partyTopicCounts[party]) partyTopicCounts[party] = {};
                            partyTopicCounts[party][classification] = (partyTopicCounts[party][classification] || 0) + 1;
                        });
                    }
                });
            });
        });

        renderWordCloud(topicCounts);
        renderTopicStackedChart(partyTopicCounts, topicCounts);
        
        const topicDetailsSection = document.getElementById('topic-details');
        topicDetailsSection.classList.add('hidden');
    }

    function handleTopicSearch(e) {
        const term = e.target.value.toLowerCase();
        const filteredItems = state.currentTopicData.filter(item => {
            return (
                item.party.toLowerCase().includes(term) ||
                item.topic.toLowerCase().includes(term) ||
                item.originalQuote.toLowerCase().includes(term)
            );
        });
        renderTopicTable(filteredItems);
    }
});
