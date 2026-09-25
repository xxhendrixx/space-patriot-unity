/* One deck plan supplies both the physical rooms and walking boundaries. Metres. */
(function (root) {
  const C = root.LongwayCore;
  C.InteriorLayout = function (craft) {
    const carrier = craft.dimensions[0] > 180,
      large = craft.dimensions[0] > 60;
    if (!large) return null;
    const bridgeEnd = carrier ? 12.6 : 7.7,
      bridgeWidth = carrier ? 8 : 5,
      hall = carrier ? 1.3 : 1.15,
      wing = carrier ? 7.7 : 5.1,
      crewStart = bridgeEnd + 2.5,
      crewEnd = crewStart + (carrier ? 8 : 7),
      engineStart = crewEnd + (carrier ? 4 : 2),
      engineEnd = engineStart + (carrier ? 13 : 8),
      cargoStart = engineEnd + 2,
      cargoEnd = cargoStart + (carrier ? 16 : 9),
      airlockEnd = cargoEnd + (carrier ? 6 : 5);
    const room = (id, name, x0, x1, z0, z1) => ({ id, name, x0, x1, z0, z1 });
    const rooms = [
      room("bridge", "FLIGHT DECK", -bridgeWidth, bridgeWidth, -3.6, bridgeEnd),
      room(
        "corridor",
        "CENTRAL PASSAGE",
        -hall,
        hall,
        bridgeEnd - 0.1,
        airlockEnd,
      ),
      room(
        "quarters",
        "CREW QUARTERS",
        -wing,
        -hall + 0.05,
        crewStart,
        crewEnd,
      ),
      room("mess", "MESS / OBSERVATION", hall - 0.05, wing, crewStart, crewEnd),
      room(
        "engineering",
        "ENGINEERING",
        -wing - 0.3,
        wing + 0.3,
        engineStart,
        engineEnd,
      ),
      room(
        "cargo",
        "CARGO HOLD",
        -wing - 0.3,
        wing + 0.3,
        cargoStart,
        cargoEnd,
      ),
      room("airlock", "AIRLOCK", -1.8, 1.8, cargoEnd - 0.1, airlockEnd),
    ];
    const fixtures = [],
      solid = (id, type, x, z, w, d, h = 1) =>
        fixtures.push({ id, type, x, z, w, d, h, solid: true });
    for (const side of [-1, 1]) {
      const x = side * (carrier ? 4.1 : 2.8),
        z = carrier ? 2.4 : 0.3;
      solid("bridge-console" + side, "console", x, z, 2.12, 1.15, 0.85);
      solid("bridge-seat" + side, "seat", x, z + 1.3, 1.22, 1.17, 1.7);
    }
    if (carrier) solid("captain", "captain", 0, 6.45, 1.4, 1.5, 1.7);
    for (let i = 0; i < (carrier ? 3 : 2); i++)
      solid(
        "bunk" + i,
        "bunk",
        -wing + 1.05,
        crewStart + 1.4 + i * 2.45,
        1.7,
        2.0,
        2.25,
      );
    solid("lockers", "locker", -hall - 0.42, crewEnd - 1, 0.62, 1.5, 2.6);
    solid(
      "mess-table",
      "table",
      hall + (wing - hall) * 0.58,
      (crewStart + crewEnd) / 2,
      1.3,
      2.3,
      0.82,
    );
    for (const side of [-1, 1])
      solid(
        "mess-seat" + side,
        "bench",
        hall + (wing - hall) * 0.58 + side * 1.12,
        (crewStart + crewEnd) / 2,
        0.58,
        2.1,
        0.8,
      );
    solid(
      "reactor",
      "reactor",
      -wing * 0.56,
      (engineStart + engineEnd) / 2,
      2.15,
      2.5,
      2.7,
    );
    for (const side of [-1, 1])
      for (let i = 0; i < (carrier ? 3 : 2); i++)
        solid(
          "rack" + side + "-" + i,
          "rack",
          side * (wing - 0.22),
          engineStart + 1.4 + i * 2.3,
          0.8,
          1.7,
          2.7,
        );
    for (const side of [-1, 1])
      for (let i = 0; i < (carrier ? 3 : 2); i++)
        solid(
          "cargo" + side + "-" + i,
          "crate",
          side * (wing * 0.6),
          cargoStart + 2.1 + i * 3.6,
          2.4,
          2.6,
          i % 2 ? 2.65 : 1.6,
        );
    const bridgeGap = bridgeWidth * 0.12;
    for (const side of [-1, 1])
      solid(
        "bridge-bulkhead" + side,
        "bulkhead",
        (side * (bridgeWidth + bridgeGap)) / 2,
        bridgeEnd,
        bridgeWidth - bridgeGap,
        0.26,
        3.7,
      );
    for (const side of [-1, 1])
      for (const interval of [
        [crewStart, (crewStart + crewEnd) / 2 - 0.85],
        [(crewStart + crewEnd) / 2 + 0.85, crewEnd],
      ])
        solid(
          "partition" + side + interval[0],
          "partition",
          side * hall,
          (interval[0] + interval[1]) / 2,
          0.14,
          interval[1] - interval[0],
          3.72,
        );
    const doors = [
      {
        id: "bridge",
        name: "BRIDGE BULKHEAD",
        axis: "z",
        x: 0,
        z: bridgeEnd + 0.9,
        width: hall * 2,
      },
      {
        id: "quarters",
        name: "CREW QUARTERS",
        axis: "x",
        x: -hall,
        z: (crewStart + crewEnd) / 2,
        width: 1.6,
      },
      {
        id: "mess",
        name: "MESS",
        axis: "x",
        x: hall,
        z: (crewStart + crewEnd) / 2,
        width: 1.6,
      },
      {
        id: "engineering",
        name: "ENGINEERING BULKHEAD",
        axis: "z",
        x: 0,
        z: engineStart - 0.9,
        width: hall * 2,
      },
      {
        id: "cargo",
        name: "CARGO BULKHEAD",
        axis: "z",
        x: 0,
        z: cargoStart - 0.9,
        width: hall * 2,
      },
      {
        id: "airlock",
        name: "AIRLOCK INNER DOOR",
        axis: "z",
        x: 0,
        z: cargoEnd + 1.0,
        width: hall * 2,
      },
    ];
    return {
      carrier,
      rooms,
      fixtures,
      doors,
      bridgeEnd,
      hall,
      wing,
      end: airlockEnd,
    };
  };
})(globalThis);
