import { state } from './state.js';
import { escapeHtml } from './utils.js';
import { renderTopicDistributionChart, renderMethodologyChart, renderStrictnessChart, renderConsensusChart, renderProximityChart } from './charts.js';

export function populateYearSelect(years) {
    const selectYear = document.getElementById('select-year');
    selectYear.innerHTML = '<option value="" disabled selected>Bitte wählen...</option>';
    if (years && Array.isArray(years)) {
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectYear.appendChild(option);
        });
    }
}

export function populateYearSelectModels(years) {
    const selectYearModels = document.getElementById('select-year-models');
    selectYearModels.innerHTML = '<option value="all" selected>Alle Jahre</option>';
    if (years && Array.isArray(years)) {
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectYearModels.appendChild(option);
        });
    }
}

export function populateModelSelect(models) {
    const selectModel = document.getElementById('select-model');
    selectModel.innerHTML = '<option value="" disabled selected>Bitte wählen...</option>';
    models.forEach(modelKey => {
        const option = document.createElement('option');
        option.value = modelKey;
        option.textContent = modelKey;
        selectModel.appendChild(option);
    });
}

export function populateModelSelectTopics(models) {
    const selectModelTopics = document.getElementById('select-model-topics');
    selectModelTopics.innerHTML = '<option value="all" selected>Alle Modelle</option>';
    models.forEach(modelKey => {
        const option = document.createElement('option');
        option.value = modelKey;
        option.textContent = modelKey;
        selectModelTopics.appendChild(option);
    });
}

export function populatePartySelect() {
    const selectParty = document.getElementById('select-party');
    selectParty.innerHTML = '<option value="" disabled selected>Bitte wählen...</option>';
    const sortedParties = Array.from(state.allPartiesSet).sort();
    sortedParties.forEach(party => {
        const option = document.createElement('option');
        option.value = party;
        option.textContent = party;
        selectParty.appendChild(option);
    });
}

export function populateMethodologyModels() {
    const methodologyList = document.getElementById('methodology-models-list');
    if (!methodologyList) return;
    methodologyList.innerHTML = '';
    
    const uniqueModels = new Set();
    for (const year in state.globalConfig) {
        Object.keys(state.globalConfig[year]).forEach(m => uniqueModels.add(m));
    }

    uniqueModels.forEach(modelKey => {
        const li = document.createElement('li');
        // Try to find display name from first occurrence
        let displayName = modelKey;
        for (const year in state.globalConfig) {
            if (state.globalConfig[year][modelKey] && state.globalConfig[year][modelKey].length > 0) {
                displayName = state.globalConfig[year][modelKey][0].model_display_name || modelKey;
                break;
            }
        }
        
        li.textContent = `${modelKey} (${displayName})`;
        methodologyList.appendChild(li);
    });
}

export function populateMethodologyYearSelect(data) {
    const selectYearMethodology = document.getElementById('select-year-methodology');
    const years = [...new Set(data.map(item => item.year))].sort((a, b) => b - a);
    selectYearMethodology.innerHTML = '<option value="all" selected>Alle Jahre</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        selectYearMethodology.appendChild(option);
    });

    selectYearMethodology.addEventListener('change', (e) => {
        const selectedYear = e.target.value;
        let filteredData = state.globalDistributionData;
        if (selectedYear !== 'all') {
            filteredData = state.globalDistributionData.filter(item => item.year === selectedYear);
        }
        renderMethodologyChart(filteredData);
        renderStrictnessChart(selectedYear);
    });
}

export function populateConsensusModelCheckboxes(data) {
    const container = document.getElementById('consensus-model-checkboxes');
    if (!container) return;
    container.innerHTML = '';
    
    // Get all unique models from all years/parties
    const allModels = new Set();
    data.forEach(yearItem => {
        if (yearItem.models) {
            yearItem.models.forEach(m => allModels.add(m));
        } else if (yearItem.raw_findings) {
             yearItem.raw_findings.forEach(f => allModels.add(f.model));
        }
    });
    
    const sortedModels = Array.from(allModels).sort();
    
    sortedModels.forEach(model => {
        const label = document.createElement('label');
        label.style.marginRight = '15px';
        label.style.cursor = 'pointer';
        label.style.display = 'inline-flex';
        label.style.alignItems = 'center';
        
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.value = model;
        checkbox.checked = true; // Default to all checked
        checkbox.className = 'consensus-model-checkbox';
        checkbox.style.marginRight = '5px';
        
        checkbox.addEventListener('change', () => {
             const selectYearConsensus = document.getElementById('select-year-consensus');
             const radiusSlider = document.getElementById('consensus-radius');
             if (selectYearConsensus.value) {
                 renderConsensusView(selectYearConsensus.value, parseInt(radiusSlider.value));
             }
        });
        
        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(model));
        container.appendChild(label);
    });
}

export function populateConsensusYearSelect(data) {
    const selectYearConsensus = document.getElementById('select-year-consensus');
    const filterConsensusMode = document.getElementById('filter-consensus-mode');
    const radiusSlider = document.getElementById('consensus-radius');
    const radiusValue = document.getElementById('consensus-radius-value');

    populateConsensusModelCheckboxes(data);

    const years = [...new Set(data.map(item => item.year))].sort((a, b) => b - a);
    selectYearConsensus.innerHTML = '<option value="" disabled selected>Bitte wählen...</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        selectYearConsensus.appendChild(option);
    });

    selectYearConsensus.addEventListener('change', (e) => {
        const selectedYear = e.target.value;
        const radius = parseInt(radiusSlider.value);
        renderConsensusView(selectedYear, radius);
    });

    radiusSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        radiusValue.textContent = `${val} Zeichen`;
        const selectedYear = selectYearConsensus.value;
        if (selectedYear) {
            renderConsensusView(selectedYear, parseInt(val));
        }
    });

    filterConsensusMode.addEventListener('change', (e) => {
        const selectedYear = selectYearConsensus.value;
        const radius = parseInt(radiusSlider.value);
        if (selectedYear) {
            renderConsensusView(selectedYear, radius);
        }
    });
}

export function renderConsensusView(year, radius = 0, filter = null) {
    const filterMode = document.getElementById('filter-consensus-mode').value;
    
    // Get selected models
    const checkboxes = document.querySelectorAll('.consensus-model-checkbox');
    const selectedModels = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => cb.value);

    // Deep copy to avoid modifying state
    let yearData = JSON.parse(JSON.stringify(state.globalConsensusData.filter(item => item.year === year)));
    
    // Filter raw_findings based on category AND selected models
    yearData.forEach(party => {
        // Recalculate total_models based on intersection of party.models and selectedModels
        if (party.models) {
             const availableSelectedModels = party.models.filter(m => selectedModels.includes(m));
             party.total_models = availableSelectedModels.length;
        } else {
             // Fallback if models array is missing
             party.total_models = selectedModels.length; 
        }

        if (party.raw_findings) {
            party.raw_findings = party.raw_findings.filter(f => {
                const categoryMatch = filterMode === 'all' || (f.category && f.category.toLowerCase().includes('explizit'));
                const modelMatch = selectedModels.includes(f.model);
                return categoryMatch && modelMatch;
            });
        }
    });

    // 2. Calculate Dynamic Clusters (Type 2)
    const clusteredData = clusterFindings(yearData, radius);

    // 3. Render Proximity Chart (Type 2)
    renderProximityChart(clusteredData);

    // 4. Render List
    renderConsensusList(clusteredData, radius, filter);
}

export function filterConsensusList(filter) {
    if (!state.currentClusteredData) return;
    const radius = document.getElementById('consensus-radius').value;
    renderConsensusList(state.currentClusteredData, parseInt(radius), filter);
}

function renderConsensusList(clusteredData, radius, filter) {
    state.currentClusteredData = clusteredData;
    const container = document.getElementById('consensus-container');
    container.innerHTML = '';

    if (clusteredData.length === 0) {
        container.innerHTML = '<p>Keine Konsens-Daten für dieses Jahr gefunden.</p>';
        return;
    }

    // Sort by party name
    clusteredData.sort((a, b) => a.party_display.localeCompare(b.party_display));

    clusteredData.forEach(partyData => {
        // Filter by party and year if specified
        if (filter) {
            if (filter.party !== undefined && partyData.party !== filter.party) return;
            if (filter.year !== undefined && partyData.year !== filter.year) return;
        }
        
        // Filter items
        let items = partyData.items;
        if (filter) {
            items = items.filter(item => {
                if (filter.minConfidence !== undefined && item.confidence < filter.minConfidence) return false;
                if (filter.maxConfidence !== undefined && item.confidence >= filter.maxConfidence) return false;
                return true;
            });
        }

        if (items.length === 0) return;

        const card = document.createElement('div');
        card.className = 'consensus-card';
        card.style.border = '1px solid #ddd';
        card.style.padding = '15px';
        card.style.marginBottom = '20px';
        card.style.borderRadius = '5px';
        card.style.backgroundColor = '#f9f9f9';

        const header = document.createElement('h3');
        header.textContent = `${partyData.party_display} (${items.length} Cluster)`;
        card.appendChild(header);

        const meta = document.createElement('p');
        meta.style.fontSize = '0.9em';
        meta.style.color = '#666';
        meta.textContent = `Analysiert von ${partyData.total_models} Modellen. Radius: ${radius} Zeichen.`;
        card.appendChild(meta);

        const list = document.createElement('ul');
        list.style.listStyleType = 'none';
        list.style.padding = '0';

        // Sort items by confidence desc
        items.sort((a, b) => b.confidence - a.confidence);

        items.forEach(item => {
            const li = document.createElement('li');
            li.style.marginBottom = '10px';
            li.style.padding = '10px';
            li.style.backgroundColor = '#fff';
            
            // Color code based on confidence
            let color = '#e74c3c'; // Red (Low)
            let label = 'Niedriger Konsens';
            if (item.confidence >= 0.8) {
                color = '#2ecc71'; // Green (High)
                label = 'Hoher Konsens';
            } else if (item.confidence >= 0.5) {
                color = '#f1c40f'; // Yellow (Medium)
                label = 'Mittlerer Konsens';
            }
            
            li.style.borderLeft = `4px solid ${color}`;
            
            const headerDiv = document.createElement('div');
            headerDiv.style.display = 'flex';
            headerDiv.style.justifyContent = 'space-between';
            headerDiv.style.marginBottom = '5px';
            headerDiv.style.cursor = 'pointer';
            
            const badge = document.createElement('span');
            badge.style.backgroundColor = color;
            badge.style.color = '#fff';
            badge.style.padding = '2px 6px';
            badge.style.borderRadius = '4px';
            badge.style.fontSize = '0.7em';
            badge.textContent = `${label} (${Math.round(item.confidence * 100)}%)`;
            
            const expandBtn = document.createElement('span');
            expandBtn.textContent = 'Details ▼';
            expandBtn.style.fontSize = '0.8em';
            expandBtn.style.color = '#3498db';

            headerDiv.appendChild(badge);
            headerDiv.appendChild(expandBtn);
            li.appendChild(headerDiv);

            const quote = document.createElement('blockquote');
            quote.style.margin = '0';
            quote.style.fontStyle = 'italic';
            quote.textContent = `"${item.text}"`;
            li.appendChild(quote);

            const details = document.createElement('div');
            details.style.fontSize = '0.8em';
            details.style.marginTop = '5px';
            details.style.color = '#888';
            details.textContent = `Gefunden von ${item.vote_count} / ${item.total_models} Modellen.`;
            li.appendChild(details);

            // Hidden details section
            const findingsList = document.createElement('div');
            findingsList.className = 'findings-details hidden';
            findingsList.style.marginTop = '10px';
            findingsList.style.paddingTop = '10px';
            findingsList.style.borderTop = '1px solid #eee';
            
            if (item.findings && item.findings.length > 0) {
                item.findings.forEach(f => {
                    const fDiv = document.createElement('div');
                    fDiv.style.marginBottom = '5px';
                    fDiv.style.fontSize = '0.85em';
                    fDiv.innerHTML = `<strong>${f.model}:</strong> "${f.text}"`;
                    findingsList.appendChild(fDiv);
                });
            }
            li.appendChild(findingsList);

            // Toggle details
            headerDiv.addEventListener('click', () => {
                findingsList.classList.toggle('hidden');
                expandBtn.textContent = findingsList.classList.contains('hidden') ? 'Details ▼' : 'Details ▲';
            });

            list.appendChild(li);
        });
        card.appendChild(list);

        container.appendChild(card);
    });
}

function clusterFindings(yearData, radius) {
    return yearData.map(party => {
        let raw = party.raw_findings || [];
        if (raw.length === 0) return { ...party, items: [] };

        // Ensure numbers
        raw = raw.map(r => ({
            ...r,
            start: parseInt(r.start),
            end: parseInt(r.end)
        }));

        // Sort by start position
        raw.sort((a, b) => a.start - b.start);

        const clusters = [];
        let currentCluster = null;

        raw.forEach(finding => {
            if (!currentCluster) {
                currentCluster = {
                    start: finding.start,
                    end: finding.end,
                    findings: [finding],
                    models: new Set([finding.model])
                };
                return;
            }

            const gap = finding.start - currentCluster.end;
            if (gap <= radius) {
                currentCluster.end = Math.max(currentCluster.end, finding.end);
                currentCluster.findings.push(finding);
                currentCluster.models.add(finding.model);
            } else {
                clusters.push(finalizeCluster(currentCluster, party.total_models));
                currentCluster = {
                    start: finding.start,
                    end: finding.end,
                    findings: [finding],
                    models: new Set([finding.model])
                };
            }
        });

        if (currentCluster) {
            clusters.push(finalizeCluster(currentCluster, party.total_models));
        }

        return {
            ...party,
            items: clusters
        };
    });
}

function finalizeCluster(cluster, totalModels) {
    // Find representative text (longest quote?)
    const longest = cluster.findings.reduce((a, b) => a.text.length > b.text.length ? a : b);
    
    return {
        text: longest.text,
        start: cluster.start,
        end: cluster.end,
        vote_count: cluster.models.size,
        total_models: totalModels,
        confidence: cluster.models.size / totalModels,
        findings: cluster.findings
    };
}

export function populateYearSelectTopics(years) {
    const selectYearTopics = document.getElementById('select-year-topics');
    if (years && Array.isArray(years)) {
        years.forEach(year => {
            const option = document.createElement('option');
            option.value = year;
            option.textContent = year;
            selectYearTopics.appendChild(option);
        });
    }
}

export function renderPartiesTable(data) {
    const partiesTableBody = document.querySelector('#parties-table tbody');
    partiesTableBody.innerHTML = '';
    if (!data || data.length === 0) {
        partiesTableBody.innerHTML = '<tr><td colspan="5">Keine Daten gefunden.</td></tr>';
        return;
    }

    // Sort data
    const { column, direction } = state.currentPartiesSort;
    const sortedData = [...data].sort((a, b) => {
        let valA = (a[column] || '').toString().toLowerCase();
        let valB = (b[column] || '').toString().toLowerCase();
        
        if (valA < valB) return direction === 'asc' ? -1 : 1;
        if (valA > valB) return direction === 'asc' ? 1 : -1;
        return 0;
    });

    sortedData.forEach(item => {
        const row = document.createElement('tr');
        
        let locationHtml = escapeHtml(item.location || '');
        if (item.sourceFile && item.originalQuote) {
            const searchPhrase = item.originalQuote.replace(/\s+/g, ' ').trim();
            const encodedSearch = encodeURIComponent(searchPhrase);
            const pdfUrl = `${item.sourceFile}#:~:text=${encodedSearch}`;
            locationHtml += ` <a href="${pdfUrl}" target="_blank" title="Im PDF öffnen">📄</a>`;
        }

        row.innerHTML = `
            <td>${escapeHtml(item.party)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.topic)}</td>
            <td>${escapeHtml(item.originalQuote)}</td>
            <td>${locationHtml}</td>
        `;
        partiesTableBody.appendChild(row);
    });
}

export function renderTable(data) {
    const detailsTableBody = document.querySelector('#details-table tbody');
    detailsTableBody.innerHTML = '';
    if (!data || data.length === 0) {
        detailsTableBody.innerHTML = '<tr><td colspan="4">Keine Daten gefunden.</td></tr>';
        return;
    }

    data.forEach(item => {
        const row = document.createElement('tr');
        
        let locationHtml = escapeHtml(item.location || '');
        if (item.sourceFile && item.originalQuote) {
            const searchPhrase = item.originalQuote.replace(/\s+/g, ' ').trim();
            const encodedSearch = encodeURIComponent(searchPhrase);
            const pdfUrl = `${item.sourceFile}#:~:text=${encodedSearch}`;
            
            locationHtml += ` <a href="${pdfUrl}" target="_blank" title="Im PDF öffnen und suchen">📄</a>`;
        }

        row.innerHTML = `
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.topic)}</td>
            <td>${escapeHtml(item.originalQuote)}</td>
            <td>${locationHtml}</td>
        `;
        detailsTableBody.appendChild(row);
    });
}

export function showDetails(topics, titleSuffix) {
    const detailsSection = document.getElementById('details-section');
    const detailsTitle = document.getElementById('details-title');
    const searchInput = document.getElementById('search-input');

    detailsSection.classList.remove('hidden');
    detailsTitle.textContent = `Details für ${titleSuffix}`;
    state.currentDetailData = topics || [];
    renderTable(state.currentDetailData);
    
    detailsSection.scrollIntoView({ behavior: 'smooth' });
    setTimeout(() => {
        if (searchInput) searchInput.focus();
    }, 250);
}

export function renderWordCloud(topicCounts) {
    const wordCloudContainer = document.getElementById('word-cloud-container');
    wordCloudContainer.innerHTML = '';
    const sortedTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 50); 

    if (sortedTopics.length === 0) {
        wordCloudContainer.innerHTML = '<p>Keine Daten verfügbar.</p>';
        return;
    }

    // Reorder topics to place biggest in the center
    const centeredTopics = [];
    sortedTopics.forEach((item, index) => {
        if (index % 2 === 0) {
            centeredTopics.push(item);
        } else {
            centeredTopics.unshift(item);
        }
    });

    const maxCount = sortedTopics[0][1].count;
    const minCount = sortedTopics[sortedTopics.length - 1][1].count;
    
    centeredTopics.forEach(([classification, data]) => {
        const span = document.createElement('span');
        span.textContent = classification;
        span.classList.add('word-cloud-item');
        
        // Calculate size: min 14px, max 60px
        const size = 14 + ((data.count - minCount) / (maxCount - minCount || 1)) * 46;
        span.style.fontSize = `${size}px`;
        
        // Add opacity based on size/importance to give depth
        const opacity = 0.6 + ((data.count - minCount) / (maxCount - minCount || 1)) * 0.4;
        span.style.opacity = opacity;

        span.addEventListener('click', () => {
            document.querySelectorAll('.word-cloud-item').forEach(el => el.classList.remove('active'));
            span.classList.add('active');
            
            showTopicDetails(classification, data.items);
        });

        wordCloudContainer.appendChild(span);
    });
}

export function showTopicDetails(classification, items) {
    const topicDetailsSection = document.getElementById('topic-details');
    const topicDetailsTitle = document.getElementById('topic-details-title');
    
    topicDetailsSection.classList.remove('hidden');
    topicDetailsTitle.textContent = `Details für "${classification}"`;
    state.currentTopicData = items;
    renderTopicDistributionChart(items, classification);
    renderTopicTable(items);
}

export function renderTopicTable(items) {
    const topicDetailsTableBody = document.querySelector('#topic-details-table tbody');
    topicDetailsTableBody.innerHTML = '';
    items.forEach(item => {
        const row = document.createElement('tr');
        
        let locationHtml = escapeHtml(item.location || '');
        if (item.sourceFile && item.originalQuote) {
            const searchPhrase = item.originalQuote.replace(/\s+/g, ' ').trim();
            const encodedSearch = encodeURIComponent(searchPhrase);
            const pdfUrl = `${item.sourceFile}#:~:text=${encodedSearch}`;
            locationHtml += ` <a href="${pdfUrl}" target="_blank" title="Im PDF öffnen">📄</a>`;
        }

        row.innerHTML = `
            <td>${escapeHtml(item.party)} (${item.year})</td>
            <td>${escapeHtml(item.model)}</td>
            <td>${escapeHtml(item.category)}</td>
            <td>${escapeHtml(item.topic)}</td>
            <td>${escapeHtml(item.originalQuote)}</td>
            <td>${locationHtml}</td>
        `;
        topicDetailsTableBody.appendChild(row);
    });
}
