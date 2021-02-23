import React, { useEffect, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance } from "d3-geo";
import { timer, select, drag } from "d3";
import { feature } from "topojson-client";
import { getOrbitLocationsByTime } from "../helpers/updateLocations";
import { useInterval } from "./UseInterval";

const WorldMap = () => {
    const [worldData, setWorldData] = useState([]);
    const [svg, setSvg] = useState([]);
    const [markerGroup, setMarkerGroup] = useState({});
    const [orbitLocations, setOrbitLocations] = useState([]);
    const [projection, setProjection] = useState(() => void undefined);
    const width = 960;
    const height = 500;
    const drawMarkers = () => {
        const center = [width / 2, height / 2];
        if (Object.keys(markerGroup).length !== 0) {
            for (let i = 1; i <= 10; i++) {
                const markers = markerGroup
                    .selectAll(".trail" + i)
                    .data(orbitLocations[i - 1]);
                markers
                    .enter()
                    .append("circle")
                    .merge(markers)
                    .attr("class", "trail" + i)
                    .attr("cx", (d) => projection([d.lng, d.lat])[0])
                    .attr("cy", (d) => projection([d.lng, d.lat])[1])
                    .attr("fill", (d) => {
                        const coordinate = [d.lng, d.lat];
                        let gdistance = geoDistance(
                            coordinate,
                            projection.invert(center)
                        );
                        return gdistance > 1.57 ? "none" : "steelblue";
                    })
                    .attr("r", i / 10)
                    .attr("opacity", i / 10);
                markerGroup.each(function () {
                    this.parentNode.appendChild(this);
                });
            }
        }
    };
    const updateLocations = async () => {
        let orbitLocations = await getOrbitLocationsByTime();
        setOrbitLocations((prevstate) => [...prevstate, ...orbitLocations]);
    };
    useInterval(() => {
        drawMarkers();
        setOrbitLocations((prevState) => {
            prevState.splice(0, 1);
            return prevState;
        });
        if (orbitLocations.length < 15) {
            updateLocations();
        }
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
            setProjection(() => geoOrthographic());
            const svg = select("svg")
                .attr("width", width)
                .attr("height", height);
            setSvg(svg);
            updateLocations();
            const markerGroup = svg.append("g");
            setMarkerGroup(markerGroup);
        };
        initialise();
    }, []);

    useEffect(() => {
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
                    drawMarkers();
                });
            }
        };

        if (svg.length !== 0) {
            drawGraticule();
            drawGlobe();
            // enableRotation();
        }
    }, [svg, worldData, projection]);
    useEffect(() => {
        const dragAndZoom = () => {
            const sensitivity = 100;
            svg.call(
                drag().on(
                    "drag",
                    (event) => {
                        const rotate = projection.rotate();
                        const k = sensitivity / projection.scale();
                        setProjection((prevState) => {
                            return prevState.rotate([
                                rotate[0] + event.dx * k,
                                rotate[1] - event.dy * k,
                            ]);
                        });
                        const path = geoPath().projection(projection);
                        svg.selectAll("path").attr("d", path);
                        drawMarkers();
                    },
                    { passive: true }
                )
            );
        };
        if (svg.length !== 0) {
            dragAndZoom();
        }
    }, [svg, projection]);

    return (
        <>
            <svg />
        </>
    );
};

export default WorldMap;
