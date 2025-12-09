import { useState } from "react";

type Division = 
  | "dhaka"
  | "chittagong"
  | "rajshahi"
  | "khulna"
  | "barisal"
  | "sylhet"
  | "rangpur"
  | "mymensingh";

const BangladeshHeatmap = () => {
  // Sample order data for each division
  const [orderData] = useState<Record<Division, number>>({
    dhaka: 1500,
    chittagong: 1200,
    rajshahi: 800,
    khulna: 650,
    barisal: 400,
    sylhet: 550,
    rangpur: 700,
    mymensingh: 900,
  });

  // Division paths (simplified coordinates for Bangladesh divisions)
  const divisionPaths: Record<Division, string> = {
    dhaka:
      "M280,200 L320,190 L340,210 L350,240 L330,270 L300,280 L270,260 L260,230 Z",
    chittagong:
      "M380,240 L420,230 L440,260 L450,300 L430,340 L400,350 L370,320 L360,280 Z",
    rajshahi:
      "M180,140 L230,130 L250,150 L260,180 L240,200 L200,190 L170,170 Z",
    khulna: "M220,280 L260,270 L280,300 L270,340 L240,360 L210,350 L200,320 Z",
    barisal: "M260,320 L300,310 L320,340 L310,380 L280,390 L250,370 Z",
    sylhet: "M320,100 L370,90 L390,120 L380,160 L350,170 L310,150 Z",
    rangpur: "M200,60 L250,50 L270,80 L260,120 L230,130 L190,110 Z",
    mymensingh: "M260,120 L310,110 L330,140 L320,180 L290,190 L250,170 Z",
  };

  // Division labels positions
  const divisionLabels: Record<Division, { x: number; y: number }> = {
    dhaka: { x: 305, y: 235 },
    chittagong: { x: 405, y: 285 },
    rajshahi: { x: 215, y: 165 },
    khulna: { x: 245, y: 320 },
    barisal: { x: 285, y: 350 },
    sylhet: { x: 350, y: 130 },
    rangpur: { x: 230, y: 90 },
    mymensingh: { x: 290, y: 150 },
  };

  const maxOrders = Math.max(...Object.values(orderData));

  // Get color based on order intensity
  const getColor = (orderCount: number) => {
    const intensity = Math.floor((orderCount / maxOrders) * 9);
    const colors = [
      "fill-red-50",
      "fill-red-100",
      "fill-red-200",
      "fill-red-300",
      "fill-red-400",
      "fill-red-500",
      "fill-red-600",
      "fill-red-700",
      "fill-red-800",
      "fill-red-900",
    ];
    return colors[intensity];
  };

  const [hoveredDivision, setHoveredDivision] = useState<Division | null>(null);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-8">
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-4xl w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-2 text-center">
          Bangladesh Order Heatmap
        </h1>
        <p className="text-gray-600 mb-6 text-center">
          Distribution of orders across divisions
        </p>

        <div className="relative">
          <svg
            viewBox="0 0 600 450"
            className="w-full h-auto"
            style={{ maxHeight: "500px" }}
          >
            {/* Render division paths */}
            {(Object.entries(divisionPaths) as [Division, string][]).map(([division, path]) => (
              <g key={division}>
                <path
                  d={path}
                  className={`${getColor(
                    orderData[division]
                  )} stroke-gray-300 stroke-2 transition-all duration-200 cursor-pointer hover:opacity-80`}
                  onMouseEnter={() => setHoveredDivision(division)}
                  onMouseLeave={() => setHoveredDivision(null)}
                />
                <text
                  x={divisionLabels[division].x}
                  y={divisionLabels[division].y}
                  className="text-xs font-semibold pointer-events-none"
                  textAnchor="middle"
                  fill="#1f2937"
                >
                  {division.charAt(0).toUpperCase() + division.slice(1)}
                </text>
              </g>
            ))}
          </svg>

          {/* Tooltip */}
          {hoveredDivision && (
            <div className="absolute top-4 right-4 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg">
              <p className="font-semibold">
                {hoveredDivision.charAt(0).toUpperCase() +
                  hoveredDivision.slice(1)}
              </p>
              <p className="text-sm">{orderData[hoveredDivision]} orders</p>
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="mt-8">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            Order Intensity
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Low</span>
            <div className="flex gap-1">
              {[
                "fill-red-100",
                "fill-red-300",
                "fill-red-500",
                "fill-red-700",
                "fill-red-900",
              ].map((color, i) => (
                <div
                  key={i}
                  className={`w-12 h-6 ${color} border border-gray-300`}
                ></div>
              ))}
            </div>
            <span className="text-xs text-gray-600">High</span>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(orderData)
            .sort((a, b) => b[1] - a[1])
            .map(([division, orders]) => (
              <div key={division} className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 capitalize">{division}</p>
                <p className="text-lg font-bold text-gray-800">{orders}</p>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default BangladeshHeatmap;
