---
title: The electrical plan
summary: Place outlets, switches, lights, sensors, junction boxes and panels on the plan with the same symbols as CadCraft's Electrical add-on, link switches to the lights they turn on, and list devices and circuits in the schedules.
section: tasks
order: 27
keywords: electrical, electrical plan, outlet, receptacle, duplex, switch, three-way, dimmer, light, ceiling light, recessed light, downlight, motion sensor, junction box, panel, distribution board, circuit, load, watts, amps, switch leg, device schedule, panel schedule, nbr 5410, conductor, cable, section, bitola, breaker, disjuntor, voltage drop, queda de tensão, ampacity, capacidade de condução, condução de corrente, circuit design, size the circuits, eletroduto, 127/220, 220/380, fator de agrupamento, fator de temperatura
---

## What you'll do

Draw the house's electrical plan in the model: outlets, switches and panels on the walls, lights and sensors on the ceiling. Each device is a real electrical element in the IFC file, with its tag, circuit and load, and switches remember the lights they turn on.

## Place devices

1. On a level, open {{ui:Build}} and choose {{ui:Electrical}}.
2. Choose the device: outlets, switches and sensors, lights, a junction box or a panel.
3. Type a **Circuit** if you know it (any name: 1, 2, A-3). Leave **Mounting height** blank for the usual height of that device.
4. Click on the plan. Outlets, switches and panels go on the face of the nearest wall, facing into the room; lights, sensors and junction boxes go on the ceiling where you click.

Devices are tagged as you place them: **R** for outlets, **S** for switches, **L** for lights, **M** for motion sensors, **J** for junction boxes, **P** for panels. Devices on a wall move with it when you move the wall.

## Link switches to lights

1. Pick a switch (or a motion sensor) and click **Link lights** in **Properties**.
2. Click each light it turns on. Click a linked light again to unlink it.
3. Press {{key:Enter}} or click **Done**.

The plan draws a dashed curve from the switch to each of its lights. A light's **Properties** shows which switches turn it on.

## Change and list them

Pick a device to change its tag, circuit, load (watts) and mounting height. Pick several to put them all on one circuit at once. Press {{key:Delete}} to remove one; a deleted light is taken off its switches.

In {{ui:Schedules}} choose **Electrical devices** for every device with its level, circuit, load, height and the lights each switch turns on, or **Circuits** for each circuit's devices, total load and current. Both are on the drawing set's schedule sheet too: see [Elevations, sections and sheets](topic:sheets).

## Size a circuit (NBR 5410)

Pick a device that has a circuit: **Circuit design** in {{ui:Properties}} sizes that circuit as NBR 5410:2004 asks, from the devices on it. It is for circuits fed at low voltage from the panel, with copper conductors.

- **Voltage system** is the project's, 127/220 V (the default), 220/380 V or 230/400 V. A circuit of **One phase and neutral** is at the phase voltage; the others at the line voltage.
- **Phases**, **Use** (lighting or power; by default it follows what is on it, and outlets count as power), **Power factor** and **Demand factor** (both 1 unless you say; the load is taken as the sum of the devices' watts, so at 1 watts are volt-amperes) give the design current.
- **Length to the farthest load**, **Installation method**, **Insulation**, **Ambient temperature** and **Circuits together** (those in the same conduit or bundle, this one included) give how much a conductor can carry and what it drops. The installation methods are the numbered ones of NBR 5410's table of types of lines, each with its reference method (A1, A2, B1, B2, C or D); 7 is a conduit embedded in masonry. A method C cable may be in a single layer or in a bundle; a buried one (D) also takes the spacing between conduits and the soil's resistivity.

BimCraft shows the **Design current**, and what the circuit **Needs**: the smallest section (never under 1.5 mm² for lighting or 2.5 mm² for power) and the smallest breaker such that the design current is at or under the breaker and the breaker at or under what the cable carries, and the voltage drop at or under the **Drop limit** (4 %, the limit NBR 5410 gives terminal circuits). What a cable carries is the current-capacity table of NBR 5410 (Tabelas 36 and 37) times the temperature factor (Tabela 40) and the grouping factor (Tabelas 42 and 45). The drop is computed with the conductor's resistance at its highest working temperature and a reactance of 0.1 Ω/km, which agrees with the makers' tables within a few per cent. The neutral and the protective conductor follow Tabelas 48 and 58.

Choose the **Section** and the **Breaker** yourself, or click {{ui:Size the circuits}}: it fills them for every circuit that needs it, as one step you can undo, and never makes a chosen section or breaker smaller. A choice that does not hold is said in red: too little current capacity, a breaker the cable cannot carry, a drop over the limit, a section under the smallest. The circuit schedule then shows the current, the conductors (for example 1 × 4 + N 4 + PE 4 mm²), the breaker and the drop.

Each circuit you design is an IfcDistributionCircuit in the IFC file (IfcElectricalCircuit in IFC2X3) with its devices assigned to it and its design in `CadCraft_Circuit`.

:::note
Not covered yet: aluminium conductors, cable trays and perforated trays (methods E and F), several layers of cables, buried cables without a conduit, short-circuit and overload checks of the breaker, harmonics, and the conduit's size. The ampacity tables are for the standard's reference temperatures and installation conditions; check the whole design against the standard and the makers' data.
:::

:::note
Mounting heights and loads are planning defaults (an outlet 16" up and 200 W, a switch at 48", a ceiling light 60 W), not a design: set the real loads, and the electrician or engineer checks the circuits and the code.
:::

:::tip
The symbols are the ones CadCraft's Electrical add-on draws on installation plans, so a plan from either app reads the same.
:::
