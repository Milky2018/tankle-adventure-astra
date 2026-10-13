///|
pub fn authored_circuits() -> Array[Circuit] {
  [
    {
      id: "rail-repair",
      duration: 2.857777777777778,
      branches: [
        {
          key: "cargo-rail:-18.0000:0.0000:25.0000",
          target: "cargo-rail",
          duration: 2.857777777777778,
        },
      ],
    },
    {
      id: "magnet",
      duration: 0.18,
      branches: [
        {
          key: "magnet:68.0000:0.0000:-23.0000",
          target: "magnet",
          duration: 0.18,
        },
      ],
    },
    {
      id: "gangway",
      duration: 0.18,
      branches: [
        {
          key: "gangway:69.5000:-8.0000:30.0000",
          target: "gangway",
          duration: 0.18,
        },
      ],
    },
    {
      id: "load",
      duration: 8.646111111111113,
      branches: [
        {
          key: "carrier:72.0000:8.0000:-90.0000",
          target: "carrier",
          duration: 8.646111111111113,
        },
        {
          key: "inspection-load:104.0000:0.0000:-18.0000",
          target: "inspection-load",
          duration: 2.0250000000000004,
        },
      ],
    },
    {
      id: "cage",
      duration: 10.623333333333335,
      branches: [
        {
          key: "cage:4.0000:0.0000:10.0000",
          target: "cage",
          duration: 10.623333333333335,
        },
      ],
    },
    {
      id: "relay-west",
      duration: 1.4,
      branches: [
        {
          key: "relay-west:-47.5000:-16.0000:44.0000",
          target: "relay-west",
          duration: 1.4,
        },
      ],
    },
    {
      id: "relay-east",
      duration: 1.4,
      branches: [
        {
          key: "relays:-50.5000:-16.0000:120.0000",
          target: "relays",
          duration: 1.4,
        },
      ],
    },
    {
      id: "prototype-shortcut",
      duration: 0.18,
      branches: [
        {
          key: "prototype-shortcut:-33.0000:-16.0000:58.0000",
          target: "prototype-shortcut",
          duration: 0.18,
        },
      ],
    },
    {
      id: "ballast",
      duration: 1.4,
      branches: [
        {
          key: "training:-44.0000:0.0000:22.0000",
          target: "training",
          duration: 1.4,
        },
      ],
    },
    {
      id: "loading-return",
      duration: 6.9316666666666675,
      branches: [
        {
          key: "bridge-crane:-6.0000:0.0000:-20.0000",
          target: "bridge-crane",
          duration: 4.837222222222223,
        },
        {
          key: "bridge-crane:-6.0000:0.0000:-28.0000",
          target: "bridge-crane",
          duration: 6.9316666666666675,
        },
        {
          key: "bridge-crane:5.0000:0.0000:-28.0000",
          target: "bridge-crane",
          duration: 4.019444444444444,
        },
        {
          key: "loading-return:24.0000:-8.0000:-64.0000",
          target: "loading-return",
          duration: 1.4,
        },
        {
          key: "loading-return:12.0000:-8.0000:-52.0000",
          target: "loading-return",
          duration: 1.4,
        },
        {
          key: "freight-platform:-6.0000:0.0000:-28.0000",
          target: "freight-platform",
          duration: 3.880555555555555,
        },
      ],
    },
    {
      id: "freight-return",
      duration: 0.18,
      branches: [
        {
          key: "freight-return:62.5000:0.0000:-40.0000",
          target: "freight-return",
          duration: 0.18,
        },
      ],
    },
    {
      id: "gallery",
      duration: 1.7299999999999998,
      branches: [
        {
          key: "gallery:224.0000:24.0000:11.5000",
          target: "gallery",
          duration: 1.7299999999999998,
        },
      ],
    },
    {
      id: "garden-optical",
      duration: 13.14888888888889,
      branches: [
        {
          key: "garden-optical:188.0000:16.0000:-4.0000",
          target: "garden-optical",
          duration: 8.236666666666668,
        },
        {
          key: "garden-lift:104.0000:-8.0000:12.0000",
          target: "garden-lift",
          duration: 13.14888888888889,
        },
      ],
    },
    {
      id: "pump",
      duration: 6.811666666666667,
      branches: [
        {
          key: "pump:52.0000:-8.0000:-10.0000",
          target: "pump",
          duration: 0.18,
        },
        {
          key: "pump:-32.0000:-8.0000:-24.0000",
          target: "pump",
          duration: 6.811666666666667,
        },
      ],
    },
    {
      id: "pressure-return",
      duration: 11.382098765432099,
      branches: [
        {
          key: "pressure-return:248.0000:-24.0000:98.0000",
          target: "pressure-return",
          duration: 7.872222222222224,
        },
        {
          key: "pressure-return:64.0000:-14.0000:-1.0000",
          target: "pressure-return",
          duration: 11.382098765432099,
        },
      ],
    },
    {
      id: "last-cage",
      duration: 8.873333333333333,
      branches: [
        {
          key: "last-cage:14.0000:-8.0000:68.0000",
          target: "last-cage",
          duration: 8.873333333333333,
        },
        {
          key: "last-cage:16.0000:-40.0000:-24.0000",
          target: "last-cage",
          duration: 1.4288888888888887,
        },
      ],
    },
    {
      id: "signal",
      duration: 1.4,
      branches: [
        {
          key: "signal:208.2000:40.0000:146.2000",
          target: "signal",
          duration: 1.4,
        },
        {
          key: "signal-dish:204.0000:40.0000:146.0000",
          target: "signal-dish",
          duration: 1.4,
        },
      ],
    },
    {
      id: "maintenance",
      duration: 1.4,
      branches: [
        {
          key: "tender-drive:108.0000:-24.0000:32.0000",
          target: "tender-drive",
          duration: 1.4,
        },
      ],
    },
    {
      id: "arsenal-return",
      duration: 6.1994444444444445,
      branches: [
        {
          key: "arsenal-return:-101.0000:8.0000:-60.0000",
          target: "arsenal-return",
          duration: 0.18,
        },
        {
          key: "arsenal-return:-60.0000:0.0000:-15.0000",
          target: "arsenal-return",
          duration: 6.1994444444444445,
        },
      ],
    },
    {
      id: "reservoir-inlet",
      duration: 1.7205555555555558,
      branches: [
        {
          key: "reservoir-diverter:-100.0000:-8.0000:98.0000",
          target: "reservoir-diverter",
          duration: 1.7205555555555558,
        },
      ],
    },
    {
      id: "proving-transfer",
      duration: 1.4788888888888896,
      branches: [
        {
          key: "proving-transfer:100.0000:16.0000:-196.0000",
          target: "proving-transfer",
          duration: 1.4788888888888896,
        },
        {
          key: "proving-load:92.0000:16.0000:-164.0000",
          target: "proving-load",
          duration: 1.4,
        },
      ],
    },
    {
      id: "lens-return",
      duration: 1.4,
      branches: [
        {
          key: "lens-return:302.0000:24.0000:-34.0000",
          target: "lens-return",
          duration: 1.4,
        },
      ],
    },
    {
      id: "hearth-transfer",
      duration: 1.4,
      branches: [
        {
          key: "hearth-transfer:32.0000:-40.0000:76.0000",
          target: "hearth-transfer",
          duration: 1.4,
        },
        {
          key: "final-load:32.0000:-40.0000:84.0000",
          target: "final-load",
          duration: 1.4,
        },
      ],
    },
    {
      id: "core-feed",
      duration: 7.954814814814815,
      branches: [
        {
          key: "core-feed:28.0000:-40.0000:13.0000",
          target: "core-feed",
          duration: 7.954814814814815,
        },
      ],
    },
    {
      id: "hearth-return",
      duration: 0.18,
      branches: [
        {
          key: "hearth-return:18.0000:-40.0000:58.0000",
          target: "hearth-return",
          duration: 0.18,
        },
      ],
    },
    {
      id: "scope-drawer",
      duration: 0.18,
      branches: [
        {
          key: "scope-screen:374.0000:24.0000:-9.0000",
          target: "scope-screen",
          duration: 0.18,
        },
      ],
    },
    {
      id: "mortar-cache",
      duration: 1.4,
      branches: [
        {
          key: "mortar-cache:158.0000:20.0000:-140.5000",
          target: "mortar-cache",
          duration: 1.4,
        },
      ],
    },
    {
      id: "collimator-drawer",
      duration: 0.18,
      branches: [
        {
          key: "collimator-drawer:368.0000:32.0000:-86.0000",
          target: "collimator-drawer",
          duration: 0.18,
        },
      ],
    },
    {
      id: "sorter-retry",
      duration: 1.4,
      branches: [
        {
          key: "sorter-retry:23.5000:-8.0000:-124.0000",
          target: "sorter-retry",
          duration: 0.18,
        },
        {
          key: "sorter-retry-lift:12.0000:-8.0000:-124.0000",
          target: "sorter-retry-lift",
          duration: 1.4,
        },
      ],
    },
    {
      id: "workshop-water",
      duration: 0.18,
      branches: [
        {
          key: "workshop-water:-186.0000:7.7500:-41.0000",
          target: "workshop-water",
          duration: 0.18,
        },
      ],
    },
    {
      id: "optical-screen",
      duration: 0.18,
      branches: [
        {
          key: "optical-screen:219.2000:24.0000:-5.5000",
          target: "optical-screen",
          duration: 0.18,
        },
      ],
    },
    {
      id: "coolant-bypass",
      duration: 1.4,
      branches: [
        {
          key: "coolant-runout:284.0000:-24.0000:106.0000",
          target: "coolant-runout",
          duration: 1.4,
        },
      ],
    },
    {
      id: "proving-inspection",
      duration: 12.151111111111112,
      branches: [
        {
          key: "proving-inspection:194.0000:16.0000:-158.0000",
          target: "proving-inspection",
          duration: 0.18,
        },
        {
          key: "proving-inspection:0.0000:15.7500:-149.0000",
          target: "proving-inspection",
          duration: 12.151111111111112,
        },
      ],
    },
    {
      id: "overseer-service",
      duration: 0.18,
      branches: [
        {
          key: "overseer-service:-14.0000:-8.0000:68.0000",
          target: "overseer-service",
          duration: 0.18,
        },
      ],
    },
    {
      id: "cargo-battery",
      duration: 12.466666666666672,
      branches: [
        {
          key: "cargo-battery:94.2000:8.0000:-133.8000",
          target: "cargo-battery",
          duration: 12.466666666666672,
        },
      ],
    },
    {
      id: "inner-thermal",
      duration: 2.9899999999999993,
      branches: [
        {
          key: "furnace-service-lift:88.0000:-40.0000:102.0000",
          target: "furnace-service-lift",
          duration: 2.9899999999999993,
        },
      ],
    },
    {
      id: "sorter",
      duration: 1.4,
      branches: [
        {
          key: "sorter:24.0000:-8.0000:-164.5000",
          target: "sorter",
          duration: 1.4,
        },
      ],
    },
    {
      id: "guardian",
      duration: 14.843333333333334,
      branches: [
        {
          key: "guardian:156.0000:24.0000:-16.5000",
          target: "guardian",
          duration: 14.843333333333334,
        },
        {
          key: "guardian:180.0000:16.0000:89.5000",
          target: "guardian",
          duration: 2.128888888888889,
        },
        {
          key: "guardian:228.0000:16.0000:64.0000",
          target: "guardian",
          duration: 2.228888888888889,
        },
      ],
    },
    {
      id: "rail-crossing",
      duration: 1.4,
      branches: [
        {
          key: "rail-inspection-bridge:-160.0000:8.0000:-72.0000",
          target: "rail-inspection-bridge",
          duration: 1.4,
        },
      ],
    },
    {
      id: "coolant-return",
      duration: 3.349444444444444,
      branches: [
        {
          key: "coolant-return-lift:284.0000:-24.0000:100.0000",
          target: "coolant-return-lift",
          duration: 2.768888888888889,
        },
        {
          key: "coolant-maintenance-bridge:300.0000:-24.0000:100.0000",
          target: "coolant-maintenance-bridge",
          duration: 1.8800000000000001,
        },
        {
          key: "coolant-bypass:278.0000:-24.0000:117.0000",
          target: "coolant-bypass",
          duration: 3.349444444444444,
        },
      ],
    },
  ]
}
