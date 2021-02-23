import { getLatLngObj } from "tle.js";
const constants = {
    xSecondsTime: 1, // time after which the data is rendered (time for running this script)
    numberOfLocations: 60, // number of locations fetched per starlink
    starlinkRegex: RegExp("STARLINK-[0-9]{1,4}", "g"),
};
const getTleArray = async () => {
    let tleFile = await fetch(
        "https://celestrak.com/NORAD/elements/starlink.txt"
    );
    let tletext = await tleFile.text();
    let tleArray = tletext.split("\n").reduce((a, c, i) => {
        i % 3
            ? i % 3 === 2
                ? (a[a.length - 1] += c + "`")
                : (a[a.length - 1] += c + "\n")
            : a.push("`" + c + "\n");
        return a;
    }, []);
    // Remove FALCON entries
    return tleArray.filter((text) => text.match(constants.starlinkRegex));
};
// return an array where each index contains positions of all the starlinks at ith second.
// [
//  [{"lat":,"lng":},{},{}...1021 entries],
//  [],
//  ...constants.numberOfLocations entries
// ]
export const getOrbitLocationsByTime = async () => {
    let tleArray = await getTleArray();
    let t0, t1, t2, t3;
    let orbitObjects = [];

    t2 = performance.now();
    let i = 0;
    while (i < constants.numberOfLocations) {
        orbitObjects.push([]);
        i = i + 1;
    }
    tleArray.forEach((tle) => {
        t0 = performance.now();
        i = 0;
        while (i < constants.numberOfLocations) {
            orbitObjects[i].push(
                getLatLngObj(
                    tle,
                    Date.now() + (constants.xSecondsTime + i) * 1000
                )
            );
            i = i + 1;
        }
        t1 = performance.now();
    });
    t3 = performance.now();
    console.log("for inner loop" + (t1 - t0) / 1000 + "seconds");
    console.log("for oouter loop" + (t3 - t2) / 1000 + "seconds");
    return orbitObjects;
};

// return an array where each index contains positions for the ith starlink for all seconds.
// [
//  "starlink-24":[{"lat":,"lng":},{},{}...60 entries ],
//  "starlink-26":[],
//  1021 entries
// ]
export const getOrbitLocationsBySat = async () => {
    let tleArray = await getTleArray();
    let t0, t1, t2, t3;
    let orbitObjects = [];

    t2 = performance.now();
    tleArray.forEach((tle) => {
        t0 = performance.now();
        let name = tle.match(constants.starlinkRegex);
        let i = 0;
        let arr = [];
        while (i < constants.numberOfLocations) {
            arr.push(
                getLatLngObj(
                    tle,
                    Date.now() + (constants.xSecondsTime + i) * 1000
                )
            );
            i = i + 1;
        }
        orbitObjects[name[0]] = arr;
        t1 = performance.now();
    });

    t3 = performance.now();
    console.log("for inner loop" + (t1 - t0) / 1000 + "seconds");
    console.log("for oouter loop" + (t3 - t2) / 1000 + "seconds");
    return orbitObjects;
};
