import React, { useEffect, useState, useRef } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance } from "d3-geo";
import { timer, select } from "d3";
import { feature } from "topojson-client";

const useInterval = (callback, delay) => {
    const savedCallback = useRef();

    // Remember the latest callback.
    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    // Set up the interval.
    useEffect(() => {
        function tick() {
            savedCallback.current();
        }
        if (delay !== null) {
            let id = setInterval(tick, delay);
            return () => clearInterval(id);
        }
    }, [delay]);
};

const WorldMap = () => {
    const [locations, setLocations] = useState([]);
    const [worldData, setWorldData] = useState([]);
    const [graticulesRendered, setGraticulesRendered] = useState(false);
    const [currentLocation, setCurrentLocation] = useState([]);
    const [count, setCount] = useState(0);
    const [svg, setSvg] = useState([]);
    const [markerGroup, setMarkerGroup] = useState([]);
    // const [initialised, setInitialised] = useState(false);
    // const [worldRendered, setWorldRendered] = useState(false);
    const width = 960;
    const height = 500;
    const drawMarkers = (markerGroup, currentLocation) => {
        const center = [width / 2, height / 2];
        const projection = geoOrthographic();
        const markers = markerGroup.selectAll("circle").data(currentLocation);
        markers
            .enter()
            .append("circle")
            .merge(markers)
            .attr("cx", (d) => projection([d.lo, d.la])[0])
            .attr("cy", (d) => projection([d.lo, d.la])[1])
            .attr("fill", (d) => {
                const coordinate = [d.lo, d.la];
                let gdistance = geoDistance(
                    coordinate,
                    projection.invert(center)
                );
                // console.log(geoDistance([50, 180], projection.invert(center)))
                // console.log(coordinate, gdistance, projection.invert(center))
                // return gdistance > 1.57 ? "none" : "steelblue";
                return "steelblue";
            })
            .attr("r", 1.5);

        markerGroup.each(function () {
            this.parentNode.appendChild(this);
        });
    };
    useInterval(() => {
        let curr = [];
        curr.push(locations[0]);
        setCurrentLocation(curr);
        setLocations((locations) => locations.filter((loc, i) => i !== 0));
        setCount(count + 1);
        drawMarkers(markerGroup, currentLocation);
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
            response = await fetch("/locations.json");
            setLocations(await response.json());
            const svg = select("svg")
                .attr("width", width)
                .attr("height", height);
            setSvg(svg);
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
            console.log("svg", svg);
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
