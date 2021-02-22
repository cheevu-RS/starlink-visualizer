import React, { useEffect, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule } from "d3-geo";
import { timer, select } from "d3";
import { feature } from "topojson-client";
import { getArrayOfTLEs } from "../helpers/updateLocations";
import { useInterval } from "./UseInterval";

  
const WorldMap = () => {
    const [worldData, setWorldData] = useState([]);
    const [currentLocation, setCurrentLocation] = useState([]);
    const [svg, setSvg] = useState([]);
    const [markerGroup, setMarkerGroup] = useState([]);
    const [orbitLocations, setOrbitLocations] = useState([]);
    const width = 960;
    const height = 500;
    const trailLength = 5;
    const drawMarkers = () => {
        const projection = geoOrthographic();
        const opacities = ["0.1","0.2","0.4","0.6","0.8"]
        if (currentLocation.length > 0) {
            for (let i = 0; i < trailLength; i++) {
                const markers = markerGroup
                    .selectAll(".trail"+i)
                    .data(currentLocation[i]);
                markers
                    .enter()
                    .append("circle")
                    .merge(markers)
                    .attr("class", "trail"+i)
                    .attr("cx", (d) => projection([d.lng, d.lat])[0])
                    .attr("cy", (d) => projection([d.lng, d.lat])[1])
                    .attr("fill", "blue")
                    .attr("r", 1)
                    .attr("opacity",opacities[i]);
                markerGroup.each(function () {
                    this.parentNode.appendChild(this);
                });
            }
        }
    };
    useInterval(() => {
        let curr = [];
        for (let i = 0; i < trailLength; i++) {
            curr.push([]);
        }
        for (let satellite in orbitLocations) {
            for (let i = 0; i < trailLength; i++) {
                curr[i].push(orbitLocations[satellite][i]);
            }
            orbitLocations[satellite].splice(0, trailLength);
        }
        setCurrentLocation(curr);
        drawMarkers();
    }, 1000);

    useEffect(() => {
        const initialise = async () => {
            let response = await fetch(
                "https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/world-110m.json"
            );
            const worldData = await response.json();
            setWorldData(
                feature(worldData, worldData.objects.countries).features
            );
            const svg = select("svg")
                .attr("width", width)
                .attr("height", height);
            setSvg(svg);
            setOrbitLocations(await getArrayOfTLEs());
            const markerGroup = svg.append("g");
            setMarkerGroup(markerGroup);
        };
        initialise();
    }, []);

    useEffect(() => {
        const projection = geoOrthographic();
        const path = geoPath().projection(projection);
        const config = {
            speed: 0.005,
            verticalTilt: -30,
            horizontalTilt: 0,
        };
        const drawGlobe = () => {
            if (svg.length !== 0) {
                svg.selectAll(".segment")
                    .data(worldData)
                    .enter()
                    .append("path")
                    .attr("class", "segment")
                    .attr("d", path)
                    .style("stroke", "#888")
                    .style("stroke-width", "1px")
                    .style("fill", (d, i) => "#e5e5e5")
                    .style("opacity", ".6");
            }
        };

        const drawGraticule = () => {
            const graticule = geoGraticule().step([10, 10]);
            console.log("drawin grat");
            svg.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path)
                .style("fill", "#fff")
                .style("stroke", "#ccc");
        };

        const enableRotation = () => {
            if (svg.length !== 0) {
                timer(function (elapsed) {
                    projection.rotate([
                        config.speed * elapsed - 120,
                        config.verticalTilt,
                        config.horizontalTilt,
                    ]);
                    svg.selectAll("path").attr("d", path);
                });
            }
        };
        if (svg.length !== 0) {
            drawGlobe();
            // drawGraticule();
            enableRotation();
        }
    }, [svg, worldData]);

    return (
        <>
            <svg />
        </>
    );
};

export default WorldMap;
