# Star Citizen research → Space Patriot implementation

Reviewed 21 September 2026. These sources informed original gameplay workflows. Space Patriot assets, balancing values, key bindings and implementation are its own.

| Primary source | Relevant pattern | Implemented in Space Patriot |
| --- | --- | --- |
| [RSI: How to Quantum Travel](https://support.robertsspaceindustries.com/hc/en-us/articles/360019449994-How-to-Quantum-Travel) | Select a destination, choose NAV, prepare the drive, then travel. The current mode appears in HUD/MFDs. | Existing destination, route and spool systems now connect to SCM/NAV state on the illustrated displays. Cruise/jump preparation selects NAV. SCM cancels travel preparation. |
| [RSI: Engineering Gameplay Guide](https://robertsspaceindustries.com/en/comm-link/transmission/20935-Engineering-Gameplay-Guide) | Resource distribution and presets; component health and temperature; reactor, cooler, shield and life-support dependencies; repairs. | Twelve shared power segments, four presets, six component states, performance factors, temperature damage, isolation and repairs consuming finite spares. |
| [RSI: Vehicle Maintenance Services](https://support.robertsspaceindustries.com/hc/en-us/articles/360007981814-Vehicle-Maintenance-Services) | Land at a service location, remain in the pilot seat, request repairs, restocking and refueling. | Port service requires a landed or docked ship with the pilot aboard; it restores hull, components, stores and fuel. |
| [RSI: Ships and Vehicles](https://support.robertsspaceindustries.com/hc/en-us/articles/360002696273-Ships-and-Vehicles) | Ships combine propulsion, systems, weapons and role-dependent characteristics. | The fleet retains distinct handling and dimensions; Wayfarer and Meridian add larger corvette/carrier hulls and bridges. |

## Deliberate implementation limits

- The displayed power budget and rates are Space Patriot balancing choices, not a reconstruction of Star Citizen's current balance.
- Repairs operate through the engineering station. Physical fuses, handheld repair tools, fire propagation and component replacement are not implemented.
- Cabin pressure has a simulated value and warning; it does not yet produce character oxygen depletion.
- Fuel is a single ship resource. Hydrogen and quantum fuel are not separate stores.
- The larger ships have a local connected deck with bridge, crew, mess, engineering, cargo and airlock, without remotely shared crew seats/turrets.
- Combat and movement networking are host-authoritative for damage and encounters. This is a small peer session, not an MMO service.

The official engineering page loads its article through RSI's Alexandria content endpoint. Its article text was inspected alongside the directly readable RSI knowledge-base pages. No Star Citizen artwork or game assets are included.
