import React, { useEffect, useState } from "react";
import { geoOrthographic, geoPath, geoGraticule, geoDistance } from "d3-geo";
import { timer, select } from "d3";
import { feature } from "topojson-client";

const WorldMap = () => {
    const width = 960;
    const height = 500;
    const config = {
        speed: 0.005,
        verticalTilt: -30,
        horizontalTilt: 0,
    };
    const projection = geoOrthographic();
    const path = geoPath().projection(projection);
    let locations = []
    useEffect(() => {
        const center = [width / 2, height / 2];

        const svg = select("svg").attr("width", width).attr("height", height);
        const markerGroup = svg.append("g");

        const drawGlobe = async () => {
            console.log("drawin globe");
            let response = await fetch(
                "https://gist.githubusercontent.com/mbostock/4090846/raw/d534aba169207548a8a3d670c9c2cc719ff05c47/world-110m.json"
            );
            const worldData = await response.json();
            response = await fetch("/locations.json");
            locations = await response.json();
            svg.selectAll(".segment")
                .data(feature(worldData, worldData.objects.countries).features)
                .enter()
                .append("path")
                .attr("class", "segment")
                .attr("d", path)
                .style("stroke", "#888")
                .style("stroke-width", "1px")
                .style("fill", (d, i) => "#e5e5e5")
                .style("opacity", ".6");
            drawMarkers();
        };

        const drawGraticule = () => {
            console.log("drawin graticules");
            const graticule = geoGraticule().step([10, 10]);

            svg.append("path")
                .datum(graticule)
                .attr("class", "graticule")
                .attr("d", path)
                .style("fill", "#fff")
                .style("stroke", "#ccc");
        };

        const enableRotation = () => {
            console.log("rotate");
            timer(function (elapsed) {
                projection.rotate([
                    config.speed * elapsed - 120,
                    config.verticalTilt,
                    config.horizontalTilt,
                ]);
                svg.selectAll("path").attr("d", path);
                drawMarkers();
            });
        };

        const drawMarkers = async () => {
            const markers = markerGroup.selectAll("circle").data(locations);
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
                    return gdistance > 1.57 ? "none" : "steelblue";
                })
                .attr("r", 1.5);

            markerGroup.each(function () {
                this.parentNode.appendChild(this);
            });
        };
        drawGlobe();
        drawGraticule();
        enableRotation();
    },[]);
    return <svg />;
};

export default WorldMap;
