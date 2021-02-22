import { getEpochTimestamp, getGroundTracks, getLatLngObj } from "tle.js";

export const getArrayOfTLEs = async () => {
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
    const starlinkRegex = new RegExp("STARLINK-[0-9]{1,4}", "g");
    tleArray = tleArray.filter((text) => text.match(starlinkRegex));
    // time after which it will render.
    const xSecondsTime = 5;
    const numberOfLocations = 360;
    let t0, t1, t2, t3;
    let orbitObjects = [];

    t2 = performance.now();
    tleArray.forEach((tle) => {
        t0 = performance.now();
        let name = tle.match(starlinkRegex);
        let i = 0;
        let arr = [];
        while (i < numberOfLocations) {
            arr.push(getLatLngObj(tle, Date.now() + (xSecondsTime + i)*2000));
            i=i+1
        }
        orbitObjects[name[0]]=arr;
        t1 = performance.now();
    });
    t3 = performance.now();
    console.log("for inner loop" + (t1 - t0) / 1000 + "seconds");
    console.log("for oouter loop" + (t3 - t2) / 1000 + "seconds");
    return orbitObjects;
};
