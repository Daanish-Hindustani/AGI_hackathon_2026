/**
 * Layer definitions for Carbon Emissions Network Map
 * Text-based visualization with size = CO2 emissions
 */

const SCALE = 0.005;

function createTextLayer(nodes, nodeType, currentZoom, opacity = 1) {
    const filteredNodes = nodes.filter(n => n.type === nodeType);

    if (filteredNodes.length === 0 || opacity <= 0) {
        return null;
    }

    const config = {
        department: {
            fontWeight: 900,
            minSize: 32,
            maxSize: 80,
            background: true
        }
    };

    const c = config[nodeType];
    if (!c) return null;

    // Dynamic size calculation: Shrink as we zoom in
    const baseSize = 24;
    // At zoom 3: size ~24. At zoom 20: size ~8.
    const dynamicSize = Math.max(8, baseSize - (currentZoom * 0.8));

    return new deck.TextLayer({
        id: `${nodeType}-text-layer`,
        data: filteredNodes,
        pickable: true,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getText: d => d.name,
        getColor: d => [...d.color, Math.round(255 * opacity)],
        getSize: d => dynamicSize,
        sizeUnits: 'pixels',
        sizeMinPixels: 5,
        sizeMaxPixels: 60,
        fontFamily: 'Inter, sans-serif',
        fontWeight: c.fontWeight,
        background: c.background,
        getBackgroundColor: [15, 23, 42, Math.round(200 * opacity)],
        backgroundPadding: [8, 4, 8, 4],
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        billboard: true,
        parameters: { depthTest: false }
    });
}

function createDepartmentNodeLayer(nodes, currentZoom, opacity = 1) {
    const filteredNodes = nodes.filter(n => n.type === 'department');
    if (filteredNodes.length === 0 || opacity <= 0) return null;

    return new deck.ScatterplotLayer({
        id: 'department-circle-layer',
        data: filteredNodes,
        pickable: true,
        opacity: opacity,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 10,
        radiusMaxPixels: 300,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getFillColor: d => [...d.color],
        getRadius: d => d.radius || 100,
        parameters: { depthTest: false },
        updateTriggers: {
            getFillColor: [opacity]
        }
    });
}

// Layer for the faint colored background behind purpose groups
function createPurposeHighlightLayer(nodes, currentZoom, opacity = 1) {
    if (currentZoom < 4) return null;
    const filteredNodes = nodes.filter(n => n.type === 'purpose-group');

    return new deck.ScatterplotLayer({
        id: 'purpose-highlight-layer',
        data: filteredNodes,
        pickable: false,
        opacity: 0.2, // Low opacity for highlight
        stroked: false,
        filled: true,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getFillColor: d => [...d.color], // Use department color
        getRadius: d => d.radius,
        radiusUnits: 'pixels', // Fixed pixel size matches layout logic
        parameters: { depthTest: false }
    });
}

// Layer for text labels on top of purpose groups
function createPurposeLabelLayer(nodes, currentZoom, opacity = 1) {
    if (currentZoom < 4) return null;
    const filteredNodes = nodes.filter(n => n.type === 'purpose-group');

    const dynamicSize = Math.max(8, 14 - (currentZoom * 0.3));

    return new deck.TextLayer({
        id: 'purpose-label-layer',
        data: filteredNodes,
        pickable: false,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getText: d => d.name,
        getSize: dynamicSize,
        getColor: [226, 232, 240, 255], // Light grey text
        backgroundColor: [15, 23, 42, 200],
        background: true,
        backgroundPadding: [4, 2],
        fontFamily: 'Inter, sans-serif',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        parameters: { depthTest: false }
    });
}

function createTripLayer(nodes, currentZoom, opacity = 1) {
    const filteredNodes = nodes.filter(n => n.type === 'trip');
    if (filteredNodes.length === 0 || opacity <= 0) return null;

    return new deck.ScatterplotLayer({
        id: 'trip-layer',
        data: filteredNodes,
        pickable: true,
        opacity: opacity,
        stroked: false,
        filled: true,
        radiusScale: 1,
        radiusMinPixels: 2,
        radiusMaxPixels: 8,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getFillColor: d => {
            if (Array.isArray(d.color)) return [...d.color];
            return [200, 200, 200]; // Fallback color
        }, // Always department color
        getRadius: d => 2 + Math.sqrt(d.emissions / 1000),
        parameters: { depthTest: false },
        updateTriggers: {
            getFillColor: [opacity]
        }
    });
}

// Layer for faint colored background behind transport groups
function createTransportHighlightLayer(nodes, currentZoom, opacity = 1) {
    if (currentZoom < 6) return null;
    const filteredNodes = nodes.filter(n => n.type === 'transport-group');

    return new deck.ScatterplotLayer({
        id: 'transport-highlight-layer',
        data: filteredNodes,
        pickable: false,
        opacity: 0.3,
        stroked: true,
        filled: true,
        getLineColor: [255, 255, 255, 100],
        getLineWidth: 1,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getFillColor: d => [...d.color],
        getRadius: d => d.radius,
        radiusUnits: 'pixels',
        parameters: { depthTest: false }
    });
}

// Layer for labels on top of transport groups
function createTransportLabelLayer(nodes, currentZoom, opacity = 1) {
    if (currentZoom < 6) return null;
    const filteredNodes = nodes.filter(n => n.type === 'transport-group');

    const dynamicSize = Math.max(6, 12 - (currentZoom * 0.2));

    return new deck.TextLayer({
        id: 'transport-label-layer',
        data: filteredNodes,
        pickable: false,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getText: d => d.name,
        getSize: dynamicSize,
        getColor: [203, 213, 225, 255],
        backgroundColor: [15, 23, 42, 220],
        background: true,
        backgroundPadding: [2, 1],
        fontFamily: 'Inter, sans-serif',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        parameters: { depthTest: false }
    });
}

// Layer for faint highlighted background for Route Clusters
function createRouteHighlightLayer(nodes, currentZoom, opacity = 1) {
    if (currentZoom < 7.5) return null;
    const filteredNodes = nodes.filter(n => n.type === 'route-group');

    return new deck.ScatterplotLayer({
        id: 'route-highlight-layer',
        data: filteredNodes,
        pickable: false,
        opacity: 0.4,
        stroked: true,
        filled: true,
        getLineColor: [255, 255, 255, 150],
        getLineWidth: 1,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getFillColor: d => [...d.color],
        getRadius: d => d.radius,
        radiusUnits: 'pixels',
        parameters: { depthTest: false }
    });
}

// Layer for labels on top of Route Clusters
function createRouteLabelLayer(nodes, currentZoom, opacity = 1) {
    if (currentZoom < 7.5) return null;
    const filteredNodes = nodes.filter(n => n.type === 'route-group');

    const dynamicSize = Math.max(5, 10 - (currentZoom * 0.15));

    return new deck.TextLayer({
        id: 'route-label-layer',
        data: filteredNodes,
        pickable: false,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getText: d => d.name,
        getSize: dynamicSize,
        getColor: [248, 250, 252, 255],
        backgroundColor: [15, 23, 42, 240],
        background: true,
        backgroundPadding: [2, 1],
        fontFamily: 'Inter, sans-serif',
        getTextAnchor: 'middle',
        getAlignmentBaseline: 'center',
        parameters: { depthTest: false }
    });
}

function createAllTextLayers(nodes, currentZoom) {
    const layers = [];

    const deptOpacity = DataProcessor.getLayerOpacity('department', currentZoom);
    const tripOpacity = DataProcessor.getLayerOpacity('trip', currentZoom);

    // 1. Purpose Highlights (Bottom)
    if (currentZoom >= 4) {
        const highlightLayer = createPurposeHighlightLayer(nodes, currentZoom);
        if (highlightLayer) layers.push(highlightLayer);
    }

    // 2. Transport Highlights (On top of Purpose Highlights)
    if (currentZoom >= 6) {
        const transHighlight = createTransportHighlightLayer(nodes, currentZoom);
        if (transHighlight) layers.push(transHighlight);
    }

    // 2b. Route Highlights (On top of Transport)
    if (currentZoom >= 7.5) {
        const routeHighlight = createRouteHighlightLayer(nodes, currentZoom);
        if (routeHighlight) layers.push(routeHighlight);
    }

    // 3. Trips (Middle) - Pushed deeper
    if (tripOpacity > 0) {
        const tripLayer = createTripLayer(nodes, currentZoom, tripOpacity);
        if (tripLayer) layers.push(tripLayer);
    }

    // 4. Transport Labels
    if (currentZoom >= 6 && currentZoom < 12) { // Extended visibility for context deep in routes
        const transLabel = createTransportLabelLayer(nodes, currentZoom);
        if (transLabel) layers.push(transLabel);
    }

    // 4b. Route Labels
    if (currentZoom >= 7.5) {
        const routeLabel = createRouteLabelLayer(nodes, currentZoom);
        if (routeLabel) layers.push(routeLabel);
    }

    // 5. Purpose Labels (Top of trips, maybe fade out if too cluttered?)
    // Let's keep them for context
    if (currentZoom >= 4 && currentZoom < 12) {
        const labelLayer = createPurposeLabelLayer(nodes, currentZoom);
        if (labelLayer) layers.push(labelLayer);
    }

    // 6. Department Labels (Top top, or fade out)
    if (deptOpacity > 0) {
        // Add the Circle Layer first (so text is on top)
        const deptCircleLayer = createDepartmentNodeLayer(nodes, currentZoom, deptOpacity);
        if (deptCircleLayer) layers.push(deptCircleLayer);

        const deptLayer = createTextLayer(nodes, 'department', currentZoom, deptOpacity);
        if (deptLayer) layers.push(deptLayer);
    }

    return layers;
}

function searchNodes(nodeData, searchTerm) {
    if (!searchTerm || searchTerm.trim() === '') return null;

    const term = searchTerm.toLowerCase();
    return nodeData.filter(node =>
        node.name?.toLowerCase().includes(term) ||
        node.department?.toLowerCase().includes(term) ||
        node.route?.toLowerCase().includes(term)
    );
}

function createSearchHighlightLayer(matchingNodes, currentZoom) {
    if (!matchingNodes || matchingNodes.length === 0) return null;

    return new deck.ScatterplotLayer({
        id: 'search-highlight',
        data: matchingNodes,
        getPosition: d => [d.x * SCALE, d.y * SCALE],
        getFillColor: [255, 255, 0, 100],
        getLineColor: [255, 255, 0, 255],
        getRadius: d => (d.textSize || 20) * 2,
        radiusUnits: 'pixels',
        stroked: true,
        lineWidthMinPixels: 2,
        pickable: false,
        parameters: { depthTest: false }
    });
}

function getCurrentLayerInfo(currentZoom) {
    if (currentZoom < 3) {
        return { name: 'Departments', hint: 'Zoom in to see individual trips' };
    } else {
        return { name: 'Individual Trips', hint: 'Exploring trip details' };
    }
}

window.Layers = {
    createTextLayer,
    createAllTextLayers,
    searchNodes,
    createSearchHighlightLayer,
    getCurrentLayerInfo,
    SCALE
};
