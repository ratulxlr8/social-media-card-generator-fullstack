import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"; // Adjust path based on your folder structure

import { ComposableMap, Geographies, Geography } from "react-simple-maps";

// 1. Data Interfaces
interface DeliveryRegion {
  id: string;
  orders: number;
}

interface GeoProperties {
  name?: string;
  NAME_1?: string;
  [key: string]: string | undefined;
}

// The GeoJSON file must be in the `public` directory to be accessible by the browser.
// The path should be absolute from the public root.
// Make sure you have moved the file to `public/data/bd-all.geo.json`.
const GEO_URL = "/bd-all.geo.json";

const deliveryData: DeliveryRegion[] = [
  { id: "Dhaka", orders: 530 },
  { id: "Chittagong", orders: 120 },
  { id: "Sylhet", orders: 45 },
  { id: "Khulna", orders: 8 },
  { id: "Rajshahi", orders: 60 },
  { id: "Rangpur", orders: 30 },
  { id: "Barisal", orders: 15 },
  { id: "Mymensingh", orders: 90 },
];

const colorScale = (orders: number): string => {
  if (orders > 100) return "#B71C1C";
  if (orders > 50) return "#EF5350";
  if (orders > 10) return "#EF9A9A";
  return "#FFEBEE";
};

const SimpleTestMap: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto">
      <h2 className="text-xl font-bold mb-4">Delivery Hotspots</h2>

      <TooltipProvider delayDuration={100}>
        <ComposableMap
          projection="geoMercator"
          projectionConfig={{
            scale: 4500,
            center: [90.3563, 23.685],
          }}
          // SVG-based components like this map often need an explicit height to be visible.
          // "height: 'auto'" can result in a rendered height of 0.
          // We'll give it a fixed height to ensure it renders correctly.
          style={{ width: "100%", height: "600px" }}
        >
          <Geographies geography={GEO_URL}>
            {({ geographies }) =>
              geographies.map((geo) => {
                const properties = geo.properties as GeoProperties;
                const regionName =
                  properties.name || properties.NAME_1 || "Unknown";
                const regionData = deliveryData.find(
                  (d) => d.id === regionName
                );
                const orderCount = regionData ? regionData.orders : 0;

                return (
                  <Tooltip key={geo.rsmKey}>
                    {/* asChild merges the trigger behavior onto the Geography SVG path */}
                    <TooltipTrigger asChild>
                      {/* We wrap the Geography in a group to ensure ref passing works smoothly if Geography resists it */}
                      <g>
                        <Geography
                          geography={geo}
                          fill={colorScale(orderCount)}
                          stroke="#FFFFFF"
                          strokeWidth={0.5}
                          style={{
                            default: { outline: "none" },
                            hover: {
                              outline: "none",
                              filter: "brightness(0.8)",
                              cursor: "pointer",
                            },
                            pressed: {
                              outline: "none",
                              filter: "brightness(0.8)",
                            },
                          }}
                        />
                      </g>
                    </TooltipTrigger>

                    <TooltipContent side="top">
                      <p className="font-semibold">{regionName}</p>
                      <p className="text-xs text-muted-foreground">
                        {orderCount} Orders
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            }
          </Geographies>
        </ComposableMap>
      </TooltipProvider>

      {/* Legend */}
      <div className="flex gap-2 text-xs mt-4">
        <div className="flex items-center">
          <span className="w-3 h-3 bg-[#FFEBEE] mr-1 rounded-sm"></span> Low
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-[#EF9A9A] mr-1 rounded-sm"></span> Med
        </div>
        <div className="flex items-center">
          <span className="w-3 h-3 bg-[#B71C1C] mr-1 rounded-sm"></span> High
        </div>
      </div>
    </div>
  );
};

export default SimpleTestMap;
