import React, { useCallback, useEffect, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance } from "d3-geo";
import { timer, select, drag, zoom } from "d3";
import { feature } from "topojson-client";
import {
    getOrbitLocationsByTime,
    getOrbitForSatellite,
} from "../helpers/tleHelper";
import { useInterval } from "./UseInterval";

const WorldMap = () => {
    const [worldData, setWorldData] = useState([]);
    const [svg, setSvg] = useState([]);
    const [markerGroup, setMarkerGroup] = useState({});
    const [orbitLocations, setOrbitLocations] = useState([]);
    const [projection, setProjection] = useState(() => void undefined);
    const [radius, setRadius] = useState([]);
    const [toolTipDiv, setToolTipDiv] = useState([]);
    const [displayOrbit, setDisplayOrbit] = useState(false);
    const [orbitForSatellite, setOrbitForSatellite] = useState([]);
    const [fetchedOrbit, setFetchedOrbit] = useState(false);
    const [orbitTracks, setOrbitTracks] = useState([]);
    const width = Math.max((window.innerWidth * 3) / 4, 960);
    const height = Math.max((window.innerHeight * 8) / 10, 500);

    const removeOrbit = useCallback(() => {
        svg.selectAll(".tracks").remove();
    }, [svg]);

    const drawMarkers = useCallback(() => {
        const center = [width / 2, height / 2];
        if (Object.keys(markerGroup).length !== 0) {
            const markers = markerGroup
                .selectAll(".starlink")
                .data(orbitLocations[0]);
            markers
                .enter()
                .append("circle")
                .merge(markers)
                .attr("class", "starlink")
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
                .attr("r", radius)
                .attr("opacity", 1)
                .on(
                    "mouseover",
                    (event, d) => {
                        toolTipDiv
                            .transition()
                            .duration(200)
                            .style("opacity", 0.9);
                        toolTipDiv
                            .html(d.name)
                            .style("left", event.pageX + "px")
                            .style("top", event.pageY - 28 + "px");
                    },
                    { passive: true }
                )
                .on(
                    "mouseout",
                    () => {
                        toolTipDiv
                            .transition()
                            .duration(500)
                            .style("opacity", 0);
                    },
                    { passive: true }
                )
                .on(
                    "click",
                    (e, d) => {
                        if (d.name === orbitForSatellite) {
                            setDisplayOrbit(false);
                            removeOrbit();
                        } else {
                            setDisplayOrbit(true);
                            setOrbitForSatellite(d.name);
                            setFetchedOrbit(false);
                        }
                    },
                    { passive: true }
                );
            markerGroup.each(function () {
                this.parentNode.appendChild(this);
            });
        }
    }, [
        orbitForSatellite,
        removeOrbit,
        projection,
        markerGroup,
        orbitLocations,
        radius,
        toolTipDiv,
        height,
        width,
    ]);

    const drawOrbit = useCallback(() => {
        if (displayOrbit && orbitTracks.length > 0) {
            removeOrbit();
            const center = [width / 2, height / 2];
            const markers = markerGroup.selectAll(".tracks").data(orbitTracks);
            markers
                .enter()
                .append("circle")
                .merge(markers)
                .attr("class", "tracks")
                // getGroundTracks returns [lng, lat]
                .attr("cx", (d) => projection(d)[0])
                .attr("cy", (d) => projection(d)[1])
                .attr("fill", (d) => {
                    let gdistance = geoDistance(d, projection.invert(center));
                    return gdistance > 1.57 ? "none" : "black";
                })
                .attr("r", radius / 2)
                .attr("opacity", 1);
        }
    }, [
        removeOrbit,
        displayOrbit,
        orbitTracks,
        projection,
        markerGroup,
        radius,
        height,
        width,
    ]);

    const getOrbit = async () => {
        let tracks = await getOrbitForSatellite(orbitForSatellite);
        setOrbitTracks(tracks);
        setFetchedOrbit(true);
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
        if (displayOrbit && !fetchedOrbit) {
            getOrbit();
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
            setRadius(1);
            const toolTipDiv = select("body")
                .append("div")
                .attr("class", "tooltip")
                .style("opacity", 0);
            setToolTipDiv(toolTipDiv);
        };
        initialise();
    }, []);

    useEffect(() => {
        drawOrbit();
    }, [orbitTracks, drawOrbit]);

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
            const sensitivity = 75;
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
                        drawOrbit();
                    },
                    { passive: true }
                )
            ).call(
                zoom()
                    .scaleExtent([0.5, 10])
                    .on(
                        "zoom",
                        (event) => {
                            const initialScale = geoOrthographic().scale();
                            setProjection((prevState) => {
                                return prevState.scale(
                                    initialScale * event.transform.k
                                );
                            });
                            setRadius(event.transform.k);
                            const path = geoPath().projection(projection);
                            svg.selectAll("path").attr("d", path);
                            drawMarkers();
                            drawOrbit();
                        },
                        { passive: true }
                    )
            );
        };
        if (svg.length !== 0) {
            dragAndZoom();
        }
    }, [svg, projection, drawMarkers, drawOrbit]);

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
            }}
        >
            <svg preserveAspectRatio="xMaxYMax meet" />
        </div>
    );
};

export default WorldMap;
