/**
 * Main Application for Carbon Emissions Network Map
 * Two layers: Departments → Trips
 */

let deckgl = null;
let graphData = null;
let deckData = null;
let currentZoom = 0;
let searchMatches = null;

async function init() {
    console.log('Initializing Carbon Emissions Network Map...');

    try {
        updateProgress(0, 'Loading emissions data...');
        const rawData = await DataProcessor.parseCSV('Emissions_Data_Table.csv');

        updateProgress(40, 'Processing data...');
        graphData = DataProcessor.processEmissionsData(rawData);

        updateProgress(70, 'Building visualization...');
        deckData = DataProcessor.nodesToDeckData(graphData.nodes);

        updateProgress(90, 'Initializing deck.gl...');
        initDeckGL();
        updateStats();
        setupUI();
        updateLayerIndicator();

        updateProgress(100, 'Complete!');
        setTimeout(() => {
            document.getElementById('loading').classList.add('hidden');
        }, 300);

        console.log('Initialization complete!');
    } catch (error) {
        console.error('Error:', error);
        document.getElementById('loading-text').textContent = `Error: ${error.message}`;
        document.getElementById('loading-text').style.color = '#ef4444';
    }
}

function updateProgress(percent, message) {
    const fill = document.getElementById('progress-fill');
    const loadingText = document.getElementById('loading-text');

    if (fill) fill.style.width = `${percent}%`;
    if (loadingText) loadingText.textContent = message;
}

function initDeckGL() {
    const { bounds } = deckData;
    const centerX = (bounds[0] + bounds[1]) / 2;
    const centerY = (bounds[2] + bounds[3]) / 2;

    deckgl = new deck.DeckGL({
        container: 'deck-container',
        initialViewState: {
            longitude: centerX,
            latitude: centerY,
            zoom: 3.5,
            minZoom: -2,
            maxZoom: 20
        },
        controller: {
            scrollZoom: { speed: 0.01, smooth: true },
            dragPan: true,
            dragRotate: false,
            doubleClickZoom: true,
            touchZoom: true,
            keyboard: true
        },
        onViewStateChange: ({ viewState }) => {
            currentZoom = viewState.zoom;
            // Removed zoom-level text update
            updateLayers();
            updateLayerIndicator();
        },
        getTooltip: getTooltip,
        layers: getLayers()
    });
}

function getLayers() {
    const layers = [];

    if (searchMatches && searchMatches.length > 0) {
        const highlightLayer = Layers.createSearchHighlightLayer(searchMatches, currentZoom);
        if (highlightLayer) layers.push(highlightLayer);
    }

    const textLayers = Layers.createAllTextLayers(graphData.nodes, currentZoom);
    layers.push(...textLayers);

    return layers;
}

function updateLayers() {
    if (!deckgl || !graphData) return;
    deckgl.setProps({ layers: getLayers() });
}

function updateLayerIndicator() {
    const hint = document.getElementById('zoom-hint');
    const legendTitle = document.querySelector('.legend-title');
    const legendItems = document.querySelector('.legend-items');

    if (currentZoom >= 7.5) {
        // Route Level
        if (hint) hint.innerHTML = `<span class="hint-icon">📍</span> <span class="hint-text"><strong>Route Clusters</strong><br>Grouped by Origin → Destination</span>`;
        if (legendTitle) legendTitle.textContent = 'Route Clusters';

        // Allow Purpose Legend to persist as it colors the clusters
        if (legendItems) {
            legendItems.innerHTML = Object.entries(DataProcessor.PURPOSE_COLORS).map(([name, color]) => `
                <div class="legend-item">
                    <span class="legend-dot" style="background: rgb(${color.join(',')})"></span>
                    ${name}
                </div>
            `).join('');
        }
    } else if (currentZoom >= 4) {
        // Purpose/Transport Level
        if (currentZoom >= 6) {
            if (hint) hint.innerHTML = `<span class="hint-icon">🚢</span> <span class="hint-text"><strong>Transport Modes</strong><br>Zoom for Routes</span>`;
            if (legendTitle) legendTitle.textContent = 'Transport Modes';
        } else {
            if (hint) hint.innerHTML = `<span class="hint-icon">💡</span> <span class="hint-text"><strong>Trip Purposes</strong><br>Colored by trip type</span>`;
            if (legendTitle) legendTitle.textContent = 'Trip Purposes';
        }

        // Render Purpose Legend
        if (legendItems) {
            legendItems.innerHTML = Object.entries(DataProcessor.PURPOSE_COLORS).map(([name, color]) => `
                <div class="legend-item">
                    <span class="legend-dot" style="background: rgb(${color.join(',')})"></span>
                    ${name}
                </div>
            `).join('');
        }
    } else {
        // Department Layer (Default)
        if (hint) hint.innerHTML = `<span class="hint-icon">💡</span> <span class="hint-text"><strong>Departments</strong><br>Zoom in to explore</span>`;
        if (legendTitle) legendTitle.textContent = 'Department Clusters';

        // Render Department Legend (Top 5 + count)
        const entries = Object.entries(DataProcessor.DEPARTMENT_COLORS).slice(0, 5);
        if (legendItems) {
            legendItems.innerHTML = entries.map(([name, color]) => `
                <div class="legend-item">
                    <span class="legend-dot" style="background: rgb(${color.join(',')})"></span>
                    ${name}
                </div>
            `).join('') + '<small style="color:var(--text-secondary);margin-top:4px;display:block">+ 9 more</small>';
        }
    }
}

function getTooltip({ object }) {
    if (!object) return null;

    const node = object;
    const colorStyle = `color:rgb(${node.color?.join(',') || '150,150,150'})`;

    if (node.type === 'department') {
        return {
            html: `
        <div style="font-weight:700;font-size:16px;margin-bottom:8px;${colorStyle}">${node.name}</div>
        <div><b>Trips:</b> ${node.tripCount?.toLocaleString() || 0}</div>
        <div><b>Total Emissions:</b> ${formatEmissions(node.emissions)} kg CO₂</div>
      `,
            style: tooltipStyle() // Uses .deck-tooltip class in CSS usually, but here we can return object
        };
    } else {
        return {
            html: `
        <div style="font-weight:700;font-size:14px;margin-bottom:6px">Trip</div>
        <div><b>Route:</b> ${node.route || node.name || 'N/A'}</div>
        <div><b>Department:</b> ${node.department}</div>
        <div><b>Emissions:</b> ${formatEmissions(node.emissions)} kg CO₂</div>
      `,
            style: tooltipStyle()
        };
    }
}

function tooltipStyle() {
    return {
        backgroundColor: 'rgba(15, 23, 42, 0.9)',
        borderRadius: '8px',
        padding: '12px 16px',
        color: '#fff',
        fontFamily: 'Inter, sans-serif',
        fontSize: '13px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
        border: '1px solid rgba(148, 163, 184, 0.1)'
    };
}

function formatEmissions(value) {
    if (value >= 1000000) return (value / 1000000).toFixed(2) + 'M';
    if (value >= 1000) return (value / 1000).toFixed(2) + 'K';
    return value?.toFixed(2) || '0';
}

function updateStats() {
    if (!graphData) return;

    document.getElementById('total-emissions').textContent =
        formatEmissions(graphData.totalEmissions) + ' kg';

    document.getElementById('visible-nodes').textContent =
        `${graphData.counts.departments} depts, ${graphData.counts.trips.toLocaleString()} trips`;
}

function setupUI() {
    const searchInput = document.getElementById('text-search');
    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchMatches = Layers.searchNodes(graphData.nodes, e.target.value);
            updateLayers();
        }, 200);
    });

    // Checkboxes
    document.getElementById('show-departments')?.addEventListener('change', updateLayers);
    document.getElementById('show-trips')?.addEventListener('change', updateLayers);
}



document.addEventListener('DOMContentLoaded', init);
