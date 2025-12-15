import { state } from './state.js';
import { getColor } from './utils.js';
import { showDetails, filterConsensusList } from './ui.js';

export function renderStrictnessChart(selectedYear) {
    const ctxStrictness = document.getElementById('chart-strictness').getContext('2d');
    const models = {}; // { modelName: { explicit: 0, semantic: 0 } }

    // Iterate over dataCache
    Object.keys(state.dataCache).forEach(model => {
        const modelData = state.dataCache[model];
        Object.keys(modelData).forEach(year => {
            if (selectedYear !== 'all' && year !== selectedYear) return;
            
            const yearData = modelData[year];
            Object.keys(yearData).forEach(party => {
                const partyData = yearData[party];
                if (partyData) {
                    if (!models[model]) models[model] = { explicit: 0, semantic: 0 };
                    models[model].explicit += partyData.explicitCount;
                    models[model].semantic += partyData.semanticCount;
                }
            });
        });
    });

    const labels = Object.keys(models).sort();
    const explicitData = labels.map(m => {
        const total = models[m].explicit + models[m].semantic;
        return total === 0 ? 0 : (models[m].explicit / total) * 100;
    });
    const semanticData = labels.map(m => {
        const total = models[m].explicit + models[m].semantic;
        return total === 0 ? 0 : (models[m].semantic / total) * 100;
    });

    if (state.chartStrictnessInstance) {
        state.chartStrictnessInstance.destroy();
    }

    state.chartStrictnessInstance = new Chart(ctxStrictness, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Explizite Verbote (%)',
                    data: explicitData,
                    backgroundColor: '#e74c3c', // Keep fixed color for strictness comparison
                },
                {
                    label: 'Semantische Verbote (%)',
                    data: semanticData,
                    backgroundColor: '#3498db', // Keep fixed color for strictness comparison
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            scales: {
                x: {
                    stacked: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Anteil (%)'
                    }
                },
                y: {
                    stacked: true
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `${context.dataset.label}: ${context.raw.toFixed(1)}%`;
                        }
                    }
                }
            }
        }
    });
}

export function renderMethodologyChart(data) {
    const ctxMethodology = document.getElementById('chart-methodology').getContext('2d');
    // Sort data: Year desc, Party asc, Model asc
    data.sort((a, b) => {
        if (a.year !== b.year) return b.year.localeCompare(a.year);
        if (a.party !== b.party) return a.party.localeCompare(b.party);
        return a.model.localeCompare(b.model);
    });

    const labels = [];
    const scatterData = [];
    const pointColors = [];
    
    data.forEach((item) => {
        const label = `${item.year} - ${item.party} (${item.model})`;
        labels.push(label);
        
        const baseColor = getColor(item.party);

        item.positions.forEach(posObj => {
            let bgColor = baseColor;
            
            scatterData.push({
                x: posObj.pos * 100, // 0-100%
                y: label,
                score: posObj.score // Store score for tooltip
            });
            
            pointColors.push(bgColor);
        });
    });

    // Adjust canvas height based on number of rows
    const rowHeight = 20;
    const chartHeight = Math.max(400, labels.length * rowHeight);
    ctxMethodology.canvas.parentNode.style.height = `${chartHeight}px`;
    ctxMethodology.canvas.height = chartHeight;

    if (state.chartMethodologyInstance) {
        state.chartMethodologyInstance.destroy();
    }

    state.chartMethodologyInstance = new Chart(ctxMethodology, {
        type: 'scatter',
        data: {
            labels: labels, // Y-axis labels
            datasets: [{
                label: 'Fundstellen',
                data: scatterData,
                backgroundColor: pointColors,
                borderColor: pointColors, // Use same color for border by default
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBorderColor: (context) => {
                    const raw = context.raw;
                    if (raw && raw.score < 90) {
                        return '#FF0000'; // Red border for fuzzy matches
                    }
                    return context.dataset.backgroundColor[context.dataIndex];
                },
                pointBorderWidth: (context) => {
                    const raw = context.raw;
                    if (raw && raw.score < 90) {
                        return 2; // Thicker border for fuzzy matches
                    }
                    return 1;
                }
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y', // Horizontal chart
            scales: {
                x: {
                    min: 0,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Position im Dokument (%)'
                    }
                },
                y: {
                    type: 'category',
                    offset: true,
                    ticks: {
                        autoSkip: false
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const score = context.raw.score;
                            return `${context.raw.y}: ${context.raw.x.toFixed(1)}% (Match: ${score}%)`;
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
}

export function updatePartiesChart(labels, semanticData, explicitData, modelName, year) {
    const ctxParties = document.getElementById('chart-parties').getContext('2d');
    if (state.chartPartiesInstance) {
        state.chartPartiesInstance.destroy();
    }

    const datasets = [];
    
    if (state.currentFilterMode !== 'explicit') {
        datasets.push({
            label: 'Semantisches Verbot',
            data: semanticData,
            backgroundColor: labels.map(l => getColor(l)), // Use party colors
            borderColor: labels.map(l => getColor(l)),
            borderWidth: 1,
            stack: 'Stack 0'
        });
    }

    datasets.push({
        label: 'Explizites Verbot',
        data: explicitData,
        backgroundColor: labels.map(l => getColor(l)), // Use party colors
        borderColor: labels.map(l => getColor(l)),
        borderWidth: 1,
        stack: 'Stack 0'
    });

    state.chartPartiesInstance = new Chart(ctxParties, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Verbotsparteien laut ${modelName} (${year})`
                }
            },
            onClick: (e) => {
                const points = state.chartPartiesInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const point = points[0];
                    const index = point.index;
                    const datasetIndex = point.datasetIndex;
                    const partyName = state.chartPartiesInstance.data.labels[index];
                    const datasetLabel = state.chartPartiesInstance.data.datasets[datasetIndex].label;

                    const isExplicitDataset = datasetLabel.toLowerCase().includes('explizit');
                    const category = isExplicitDataset ? 'explizit' : 'semantisch';
                    
                    // Set filter state
                    state.currentPartiesTableFilter = {
                        party: partyName,
                        category: category,
                        year: year
                    };
                    
                    // Trigger filter update via custom event
                    window.dispatchEvent(new CustomEvent('filterPartiesTable', {
                        detail: { party: partyName, category: category, year: year }
                    }));
                } else {
                    // Click outside bars - reset filter
                    state.currentPartiesTableFilter = null;
                    window.dispatchEvent(new CustomEvent('filterPartiesTable', {
                        detail: null
                    }));
                }
            }
        }
    });
}

export function updateTrendChart(modelName) {
    const ctxTrend = document.getElementById('chart-trend').getContext('2d');
    if (state.chartTrendInstance) {
        state.chartTrendInstance.destroy();
    }

    const modelData = state.dataCache[modelName];
    if (!modelData) return;

    const years = Object.keys(modelData).sort();
    
    // Collect all parties across all years
    const allParties = new Set();
    years.forEach(y => Object.keys(modelData[y]).forEach(p => allParties.add(p)));
    
    const datasets = Array.from(allParties).map((party, index) => {
        const data = years.map(year => {
            const pData = modelData[year][party];
            if (!pData) return 0;
            return state.currentFilterMode === 'explicit' 
                ? pData.explicitCount 
                : (pData.semanticCount + pData.explicitCount);
        });

        const color = getColor(party);

        return {
            label: party,
            data: data,
            borderColor: color,
            backgroundColor: color,
            fill: false,
            tension: 0.1
        };
    });

    state.chartTrendInstance = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: years,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Trend der Verbote über die Jahre (${modelName})`
                }
            }
        }
    });
}

export function updateModelsChart(labels, semanticData, explicitData, partyName, detailDataMap, selectedYear) {
    const ctxModels = document.getElementById('chart-models').getContext('2d');
    if (state.chartModelsInstance) {
        state.chartModelsInstance.destroy();
    }

    const datasets = [];
    if (state.currentFilterMode !== 'explicit') {
        datasets.push({
            label: 'Semantisches Verbot',
            data: semanticData,
            backgroundColor: 'rgba(54, 162, 235, 0.7)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
            stack: 'Stack 0'
        });
    }
    datasets.push({
        label: 'Explizites Verbot',
        data: explicitData,
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: 'rgba(255, 99, 132, 1)',
        borderWidth: 1,
        stack: 'Stack 0'
    });

    const yearText = selectedYear && selectedYear !== 'all' ? `(${selectedYear})` : '(Alle Jahre)';

    state.chartModelsInstance = new Chart(ctxModels, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                title: {
                    display: true,
                    text: `Analyse der ${partyName} durch verschiedene Modelle ${yearText}`
                }
            },
            onClick: (e) => {
                const points = state.chartModelsInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const index = points[0].index;
                    const modelName = state.chartModelsInstance.data.labels[index];
                    showDetails(detailDataMap[modelName], `${partyName} (${modelName})`);
                }
            }
        }
    });
}

export function renderTopicDistributionChart(items, classification) {
    const ctxTopicDistribution = document.getElementById('chart-topic-distribution').getContext('2d');
    const partyCounts = {};
    items.forEach(item => {
        partyCounts[item.party] = (partyCounts[item.party] || 0) + 1;
    });

    const labels = Object.keys(partyCounts).sort();
    const data = labels.map(p => partyCounts[p]);

    if (state.chartTopicDistributionInstance) {
        state.chartTopicDistributionInstance.destroy();
    }

    state.chartTopicDistributionInstance = new Chart(ctxTopicDistribution, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Anzahl Nennungen',
                data: data,
                backgroundColor: labels.map(p => getColor(p)),
                borderColor: labels.map(p => getColor(p)),
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `Verteilung von "${classification}" nach Parteien`
                },
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    }
                }
            }
        }
    });
}

export function renderTopicStackedChart(partyTopicCounts, globalTopicCounts) {
    const ctx = document.getElementById('chart-topics-stacked').getContext('2d');
    
    // 1. Identify Top 10 Topics
    const sortedTopics = Object.entries(globalTopicCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .map(entry => entry[0]);
    
    const top10 = sortedTopics.slice(0, 10);
    const hasOthers = sortedTopics.length > 10;

    // 2. Prepare Data Structure
    const parties = Object.keys(partyTopicCounts).sort();
    
    // Datasets: One for each Top 10 topic + Others
    const datasets = top10.map((topic, index) => {
        const data = parties.map(party => partyTopicCounts[party][topic] || 0);
        // Generate a color for this topic (using a palette)
        const hue = (index * 360 / 11) % 360;
        return {
            label: topic,
            data: data,
            backgroundColor: `hsl(${hue}, 70%, 60%)`,
            stack: 'Stack 0'
        };
    });

    if (hasOthers) {
        const otherData = parties.map(party => {
            let count = 0;
            Object.keys(partyTopicCounts[party]).forEach(t => {
                if (!top10.includes(t)) count += partyTopicCounts[party][t];
            });
            return count;
        });
        datasets.push({
            label: 'Andere',
            data: otherData,
            backgroundColor: '#95a5a6', // Grey for others
            stack: 'Stack 0'
        });
    }

    if (state.chartTopicStackedInstance) {
        state.chartTopicStackedInstance.destroy();
    }

    state.chartTopicStackedInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: parties,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: 'Top 10 Themen pro Partei'
                },
                tooltip: {
                    mode: 'index',
                    intersect: false
                },
                legend: {
                    position: 'bottom'
                }
            },
            scales: {
                x: {
                    stacked: true
                },
                y: {
                    stacked: true,
                    beginAtZero: true
                }
            }
        }
    });
}

export function renderProximityChart(yearData) {
    const ctxProximity = document.getElementById('chart-proximity').getContext('2d');
    
    // Prepare data
    // Sort by party name
    yearData.sort((a, b) => a.party_display.localeCompare(b.party_display));
    
    const labels = yearData.map(d => `${d.party.toUpperCase()} (${d.year})`);
    
    // Buckets for confidence
    const highConf = [];   // > 80%
    const medConf = [];    // 50% - 80%
    const lowConf = [];    // < 50%
    
    yearData.forEach(party => {
        let h = 0, m = 0, l = 0;
        party.items.forEach(item => {
            if (item.confidence >= 0.8) h++;
            else if (item.confidence >= 0.5) m++;
            else l++;
        });
        highConf.push(h);
        medConf.push(m);
        lowConf.push(l);
    });

    if (state.chartProximityInstance) {
        state.chartProximityInstance.destroy();
    }

    state.chartProximityInstance = new Chart(ctxProximity, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hoher Konsens (>80%)',
                    data: highConf,
                    backgroundColor: '#2ecc71', // Green
                },
                {
                    label: 'Mittlerer Konsens (50-80%)',
                    data: medConf,
                    backgroundColor: '#f1c40f', // Yellow
                },
                {
                    label: 'Niedriger Konsens (<50%)',
                    data: lowConf,
                    backgroundColor: '#e74c3c', // Red
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Anzahl gefundener Cluster'
                    }
                },
                x: {
                    stacked: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Dynamische Konsens-Cluster'
                },
                tooltip: {
                    callbacks: {
                        footer: (tooltipItems) => {
                            const index = tooltipItems[0].dataIndex;
                            const party = yearData[index];
                            return `Modelle im Vergleich: ${party.total_models}`;
                        }
                    }
                }
            },
            onClick: (e) => {
                const points = state.chartProximityInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const datasetIndex = points[0].datasetIndex;
                    const dataIndex = points[0].index;
                    
                    // Get party and year from clicked bar
                    const clickedData = yearData[dataIndex];
                    const party = clickedData.party;
                    const year = clickedData.year;
                    
                    // 0: High, 1: Medium, 2: Low
                    let min = 0, max = 1;
                    if (datasetIndex === 0) { min = 0.8; max = 1.1; }
                    else if (datasetIndex === 1) { min = 0.5; max = 0.8; }
                    else { min = 0; max = 0.5; }
                    
                    filterConsensusList({ minConfidence: min, maxConfidence: max, party: party, year: year });
                } else {
                    filterConsensusList(null);
                }
            }
        }
    });
}

export function renderConsensusChart(yearData) {
    const ctxConsensus = document.getElementById('chart-consensus').getContext('2d');
    
    // Prepare data
    // Sort by party name
    yearData.sort((a, b) => a.party_display.localeCompare(b.party_display));
    
    const labels = yearData.map(d => `${d.party.toUpperCase()} (${d.year})`);
    
    // Buckets for confidence
    const highConf = [];   // > 80%
    const medConf = [];    // 50% - 80%
    const lowConf = [];    // < 50%
    
    yearData.forEach(party => {
        let h = 0, m = 0, l = 0;
        party.items.forEach(item => {
            if (item.confidence >= 0.8) h++;
            else if (item.confidence >= 0.5) m++;
            else l++;
        });
        highConf.push(h);
        medConf.push(m);
        lowConf.push(l);
    });

    if (state.chartConsensusInstance) {
        state.chartConsensusInstance.destroy();
    }

    state.chartConsensusInstance = new Chart(ctxConsensus, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Hoher Konsens (>80%)',
                    data: highConf,
                    backgroundColor: '#2ecc71', // Green
                },
                {
                    label: 'Mittlerer Konsens (50-80%)',
                    data: medConf,
                    backgroundColor: '#f1c40f', // Yellow
                },
                {
                    label: 'Niedriger Konsens (<50%)',
                    data: lowConf,
                    backgroundColor: '#e74c3c', // Red
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    stacked: true,
                    title: {
                        display: true,
                        text: 'Anzahl gefundener Verbote'
                    }
                },
                x: {
                    stacked: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Konsens der KI-Modelle pro Partei'
                },
                tooltip: {
                    callbacks: {
                        footer: (tooltipItems) => {
                            const index = tooltipItems[0].dataIndex;
                            const party = yearData[index];
                            return `Modelle im Vergleich: ${party.total_models}`;
                        }
                    }
                }
            },
            onClick: (e) => {
                const points = state.chartConsensusInstance.getElementsAtEventForMode(e, 'nearest', { intersect: true }, true);
                if (points.length) {
                    const datasetIndex = points[0].datasetIndex;
                    const dataIndex = points[0].index;
                    
                    // Get party and year from clicked bar
                    const clickedData = yearData[dataIndex];
                    const party = clickedData.party;
                    const year = clickedData.year;
                    
                    // 0: High, 1: Medium, 2: Low
                    let min = 0, max = 1;
                    if (datasetIndex === 0) { min = 0.8; max = 1.1; }
                    else if (datasetIndex === 1) { min = 0.5; max = 0.8; }
                    else { min = 0; max = 0.5; }
                    
                    filterConsensusList({ minConfidence: min, maxConfidence: max, party: party, year: year });
                } else {
                    filterConsensusList(null);
                }
            }
        }
    });
}
