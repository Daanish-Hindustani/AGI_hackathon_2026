/**
 * Data Processor for Carbon Emissions Network Map
 * Two layers: Departments → Trips
 * Text size = CO2 emissions
 */

// Department colors
// Department colors - Neon/Vibrant for Dark Mode
const DEPARTMENT_COLORS = {
    'Sales': [56, 189, 248],           // Sky Blue
    'Marketing': [244, 114, 182],      // Pink
    'Customer Support': [52, 211, 153], // Emerald
    'Executive Management': [167, 139, 250], // Violet
    'Value Engineering': [251, 191, 36], // Amber
    'Services': [34, 211, 238],        // Cyan
    'Ecosystem': [251, 113, 133],      // Rose
    'Office Management': [74, 222, 128], // Green
    'Legal': [251, 146, 60],           // Orange
    'Finance': [192, 132, 252],        // Purple
    'Operations': [14, 165, 233],      // Light Blue
    'Product Management': [250, 204, 21], // Yellow
    'HR': [129, 140, 248],             // Indigo
    'Engineering': [45, 212, 191]      // Teal
};

// Purpose colors - Distinct High Contrast
const PURPOSE_COLORS = {
    'Conference/Exhibition': [248, 113, 113], // Red
    'Customer Visit': [96, 165, 250],         // Blue
    'Internal Meeting': [250, 204, 21],       // Yellow
    'Training': [192, 132, 252],              // Purple
    'Project Work': [74, 222, 128],           // Green
    'Other': [148, 163, 184]                  // Slate
};

// Zoom thresholds
const ZOOM_THRESHOLDS = {
    department: { min: 0, max: Infinity },
    trip: { min: 4, max: Infinity }, // Keep individual nodes visible
    purpose: { min: 4, max: Infinity },
    transport: { min: 6, max: Infinity },
    route: { min: 7.5, max: Infinity } // New layer
};

async function parseCSV(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error)
        });
    });
}

function getDepartmentColor(name) {
    return DEPARTMENT_COLORS[name] || [128, 128, 128];
}

function processEmissionsData(rawData) {
    const departments = new Map();
    const trips = [];
    let totalEmissions = 0;

    rawData.forEach(row => {
        // Handle potential CSV artifacts or empty rows
        if (!row['Business Dept'] || !row['Carbon Emission']) return;

        const deptName = row['Business Dept'];
        const emissions = Number(row['Carbon Emission']) || 0;

        // 1. Process Department
        if (!departments.has(deptName)) {
            departments.set(deptName, {
                id: `dept_${deptName}`,
                type: 'department',
                name: deptName,
                emissions: 0,
                tripCount: 0,
                color: getDepartmentColor(deptName),
                radius: 0, // Calculated later
                x: 0, y: 0 // Positioned later
            });
        }

        const dept = departments.get(deptName);
        dept.emissions += emissions;
        dept.tripCount++;
        totalEmissions += emissions;

        // 2. Process Trip
        const trip = {
            id: `trip_${row['Trip ID'] || Math.random().toString(36).substr(2, 9)}`,
            type: 'trip',
            department: deptName,
            purpose: row['Purpose'] || 'Other',
            transportMode: row['Shipping Type'] || 'Other', // Using 'Shipping Type' as transport mode based on CSV
            route: `${row['Departure City'] || 'Unknown'} → ${row['Arrival City'] || 'Unknown'}`,
            emissions: emissions,
            cost: row['Net Costs'] || 0,
            color: getDepartmentColor(deptName), // Inherit color from department
            x: 0, y: 0 // Positioned later
        };
        trips.push(trip);
    });

    // Calculate radii for departments based on total emissions
    departments.forEach(dept => {
        // Base size + log scale of emissions
        dept.radius = 100 + Math.sqrt(dept.emissions) * 0.5;
    });

    console.log(`Processed ${departments.size} departments and ${trips.length} trips.`);

    // Position everything
    const nodes = positionNodes(departments, trips);

    return {
        nodes,
        departments: Array.from(departments.values()),
        totalEmissions,
        counts: {
            departments: departments.size,
            trips: trips.length
        }
    };
}


function positionNodes(departments, trips) {
    const nodes = [];
    const deptArray = Array.from(departments.values());
    const spacing = 700; // Increased further for more sub-cluster space

    // Position departments
    const angleIncrement = 137.508 * (Math.PI / 180);
    const PURPOSE_GROUP_RADIUS = 75; // Increased
    const TRANSPORT_GROUP_RADIUS = 22; // Increased
    const ROUTE_GROUP_RADIUS = 6;  // New radius for route clusters
    const DEPT_CLUSTER_RADIUS = 180; // Increased

    const deptPositions = new Map();
    deptArray.forEach((dept, i) => {
        const r = spacing * Math.sqrt(i);
        const theta = i * angleIncrement;
        dept.x = r * Math.cos(theta);
        dept.y = r * Math.sin(theta);
        dept.textSize = 32 + Math.sqrt(dept.emissions / 2000) * 12;
        nodes.push(dept);
        deptPositions.set(dept.name, { x: dept.x, y: dept.y });
    });

    // Group trips by Dept -> Purpose -> Transport -> Route
    const deptGroups = new Map();
    trips.forEach(trip => {
        if (!deptGroups.has(trip.department)) deptGroups.set(trip.department, new Map());
        const purposeMap = deptGroups.get(trip.department);

        if (!purposeMap.has(trip.purpose)) purposeMap.set(trip.purpose, new Map());
        const transportMap = purposeMap.get(trip.purpose);

        const transport = trip.transportMode || 'Other';
        if (!transportMap.has(transport)) transportMap.set(transport, new Map());
        const routeMap = transportMap.get(transport);

        // Define route key (City A -> City B)
        const routeKey = trip.route || 'Unknown Route';
        if (!routeMap.has(routeKey)) routeMap.set(routeKey, []);
        routeMap.get(routeKey).push(trip);
    });

    // Position Groups
    deptGroups.forEach((purposeMap, deptName) => {
        const deptPos = deptPositions.get(deptName);
        if (!deptPos) return;

        const purposes = Array.from(purposeMap.keys());
        const purposeAngleStep = (2 * Math.PI) / (purposes.length || 1);

        purposes.forEach((purpose, i) => {
            // 1. Position Purpose Group
            const purposeAngle = i * purposeAngleStep;
            const purposeX = deptPos.x + DEPT_CLUSTER_RADIUS * Math.cos(purposeAngle);
            const purposeY = deptPos.y + DEPT_CLUSTER_RADIUS * Math.sin(purposeAngle);

            nodes.push({
                id: `group_${deptName}_${purpose}`,
                type: 'purpose-group',
                name: purpose,
                department: deptName,
                x: purposeX,
                y: purposeY,
                color: getDepartmentColor(deptName),
                radius: PURPOSE_GROUP_RADIUS + 20
            });

            // 2. Position Transport Groups within Purpose Group
            const transportMap = purposeMap.get(purpose);
            const transports = Array.from(transportMap.keys());
            const transportLayoutRadius = transports.length > 1 ? PURPOSE_GROUP_RADIUS * 0.65 : 0;
            const transportAngleStep = (2 * Math.PI) / (transports.length || 1);

            transports.forEach((transport, j) => {
                const transportAngle = j * transportAngleStep;
                const transportX = purposeX + transportLayoutRadius * Math.cos(transportAngle);
                const transportY = purposeY + transportLayoutRadius * Math.sin(transportAngle);

                nodes.push({
                    id: `trans_${deptName}_${purpose}_${transport}`,
                    type: 'transport-group',
                    name: transport,
                    department: deptName,
                    purpose: purpose,
                    x: transportX,
                    y: transportY,
                    color: getDepartmentColor(deptName),
                    radius: TRANSPORT_GROUP_RADIUS + 10
                });

                // 3. Position Route Groups within Transport Group
                const routeMap = transportMap.get(transport);
                const routes = Array.from(routeMap.keys());
                // Layout routes in a circle within the Transport group
                const routeLayoutRadius = routes.length > 1 ? TRANSPORT_GROUP_RADIUS * 0.6 : 0;
                const routeAngleStep = (2 * Math.PI) / (routes.length || 1);

                routes.forEach((route, k) => {
                    const routeAngle = k * routeAngleStep;
                    const routeX = transportX + routeLayoutRadius * Math.cos(routeAngle);
                    const routeY = transportY + routeLayoutRadius * Math.sin(routeAngle);

                    nodes.push({
                        id: `route_${deptName}_${purpose}_${transport}_${k}`,
                        type: 'route-group',
                        name: route, // "City A -> City B"
                        department: deptName,
                        purpose: purpose,
                        transport: transport,
                        x: routeX,
                        y: routeY,
                        color: getDepartmentColor(deptName),
                        radius: ROUTE_GROUP_RADIUS + 2
                    });

                    // 4. Position Trips within Route Group
                    const tripList = routeMap.get(route);
                    tripList.forEach(trip => {
                        // Tight cluster for individual trips
                        const r = ROUTE_GROUP_RADIUS * Math.sqrt(Math.random()) * 0.8;
                        const angle = Math.random() * 2 * Math.PI;
                        trip.x = routeX + r * Math.cos(angle);
                        trip.y = routeY + r * Math.sin(angle);
                        trip.textSize = 8;
                        nodes.push(trip);
                    });
                });
            });
        });
    });

    return nodes;
}

function getLayerOpacity(nodeType, currentZoom) {
    const threshold = ZOOM_THRESHOLDS[nodeType];
    if (!threshold) return 0;

    if (currentZoom < threshold.min) return 0;
    if (currentZoom >= threshold.max) return 0;

    // Fade out as approaching max threshold
    const fadeRange = 0.5;
    if (currentZoom > threshold.max - fadeRange) {
        return (threshold.max - currentZoom) / fadeRange;
    }

    return 1;
}

function nodesToDeckData(nodes) {
    const scale = 0.005;
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;

    nodes.forEach(node => {
        const x = node.x * scale;
        const y = node.y * scale;
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
    });

    return {
        nodeData: nodes,
        bounds: [minX, maxX, minY, maxY],
        scale
    };
}

window.DataProcessor = {
    parseCSV,
    processEmissionsData,
    nodesToDeckData,
    getLayerOpacity,
    getDepartmentColor,
    DEPARTMENT_COLORS,
    PURPOSE_COLORS,
    ZOOM_THRESHOLDS
};
