---
title: Pipes and ducts
summary: Draw pipe and duct runs on the plan by their centre lines; the elbows, tees, reducers and transitions are made for you, the runs belong to systems with connected ports in the IFC file, and they show in plans, schedules and the takeoff.
section: tasks
order: 36
keywords: pipe, pipes, piping, plumbing, duct, ducts, ductwork, hvac, mep, mechanical, elbow, tee, reducer, transition, fitting, fittings, valve, valves, gate valve, ball valve, globe valve, check valve, riser, slope, drain, sanitary, storm, vent, cold water, hot water, chilled water, heating, gas, fire protection, supply air, return air, exhaust, system, systems, port, ports, connector, connectors, fixture, fixtures, plumbing fixture, basin, sink, toilet, water closet, lavatory, kitchen sink, shower, laundry tub, fixture units, uhc, dfu, size the drains, drain sizing, building drain, branch, ramal, coletor, stack, stacks, tubo de queda, vent stack, branch vent, coluna de ventilação, ramal de ventilação, barrilete, size the vents, trap to vent, desconector, storm, storm drain, downpipe, leader, rainwater, águas pluviais, condutor vertical, condutor horizontal, nbr 10844, ábaco, abacus, rainfall, water supply, pressure, head loss, tank, reservatório, nbr 5626, pesos, weights, vazão, pressão, airflow, cfm, friction, equal friction, sizing, schedule, takeoff, nbr, nbr 5648, nbr 5688, nbr 8160, pvc soldável, esgoto, dn, fire, hydrant, hose reel, mangotinho, hidrante, incêndio, it 22, cbpmesp, hazen-williams
---

## What you'll do

Draw the pipes and ducts of a building the way you draw walls: click the corners of a run's centre line at the height you set. BimCraft makes the fittings, puts each part in its system and connects them, so other programs read the run as one connected system.

## Draw a pipe

1. Turn on {{ui:Draw}}, open {{ui:Build}} and choose {{ui:Pipe}}.
2. In the bar, pick the **system** (cold water, hot water, sanitary drain, gas…). It sets a usual material: copper for water, PVC for drains and vents, steel for heating, chilled water, gas and fire protection. Change the **material**, **class** and **size** if you need to. Sizes and walls come from public standards: steel pipe ASME B36.10M, copper tube ASTM B88, PVC ASTM D1785 and PEX ASTM F876. Brazilian projects can use **PVC water pipe (NBR 5648)**, the solvent-weld PVC for cold water, and **PVC drain pipe (NBR 5688)**, série normal or reforçada, for drains and vents: their sizes are named by DN (DN 25, DN 100). Once you pick one of them, choosing another system keeps to the Brazilian pipes (PVC drain pipe for a sanitary drain after PVC water pipe).
3. Set **At**: the height of the pipe's centre line above the level.
4. Click where the pipe starts, then each corner. Double-click, or press {{key:Enter}}, at the last point. {{key:Backspace}} takes back the last corner; {{key:Esc}} drops the run.

The pipe snaps like walls do, and to other runs: start on a pipe's end to carry on from it, or end on a pipe's line to branch off it. A new run takes the height of the pipe it snaps to.

## Draw a duct

1. Choose {{ui:Duct}}. Pick the system (supply, return, exhaust or outside air) and the shape: round, rectangular or flat oval.
2. Type the width and height (a round duct's width is its diameter), and **At** for the centre line's height.
3. To size it from the airflow, type the **Airflow** and the **Friction** rate and click {{ui:Size it}}. The duct is sized by equal friction, the method in the duct design chapter of the ASHRAE Handbook, and rounded up to a stocked size, so the friction comes out at or under the rate you typed. With no rate typed it uses 0.08 in. of water per 100 ft (0.8 Pa/m). A rectangular duct keeps the height you typed and gets a width; BimCraft says so when its sides are more than 4 to 1.
4. Click the corners as for a pipe.

## Plumbing fixtures

{{ui:Build}} › {{ui:Place family}} offers five fixtures to start from, each with a drain and a cold-water connector: a **Water closet**, a **Lavatory**, a **Kitchen sink**, a **Shower tray** and a **Laundry tub**. Their front faces you as you place them and their back goes against the wall. Their drains are at the smallest fixture drain of NBR 8160 (DN 100 for the water closet, DN 50 for the kitchen sink, DN 40 for the others); water is DN 20. Change their sizes, or edit them, as any family: see [Families and their sizes](topic:families).

A family says which fixture it is under {{ui:Plumbing fixture}} on the {{ui:Connectors}} tab of the family editor. Its drain is then counted in fixture units: 6 UHC for a water closet, 1 for a lavatory, 3 for a kitchen sink or a laundry tub, 2 for a shower (NBR 8160), or the drainage fixture units of IPC Table 709.1.

## From a fixture's connector

Elements placed from a family with connectors (a basin's drain and tap, an air terminal's neck: see [Edit a family](topic:family-editor)) show their free connectors as points while {{ui:Pipe}} or {{ui:Duct}} is on, and the pointer snaps to them.

- **Start on a connector**: the run takes its system and size (the pipe of the bar's material at or just above the connector's size; a round duct of its diameter). When the connector points down or up, as a drain under a basin does, the run first goes straight down or up to the height in **At**, then on along your clicks.
- **End on a connector**: the run goes down or up onto it and ends there.

The run is connected to the element in the IFC file, so other programs see the fixture as part of its system. An element placed later with a connector on the end of a run is connected to it too. A run moved away from a connector is no longer connected to it.

## The fittings, made for you

| Where | What BimCraft makes |
|---|---|
| A run turns | An elbow. Steel pipe at the long radius of ASME B16.9 (1.5 × the size), other pipe at one outside diameter, round duct at 1.5 diameters, rectangular duct at one width (or one height for a turn up or down) |
| A run ends on another run's line | A tee; the other run is split there |
| Two runs meet end to end at different sizes | A reducer (pipes) or a transition (ducts) |
| Two runs of one size meet end to end at an angle | An elbow |

When you change, move or delete a run, every fitting on that level is made again. If a leg is too short for the fittings at its ends, BimCraft says so and changes nothing: move the corner further away.

:::note
The fittings and valves are generic: drawn from the pipe or duct size, not from a maker's catalogue. Socket, press and grooved fittings, valve bodies and equipment have makers' own sizes; check them with your supplier before you order.
:::

## Risers

While drawing, type a new height in **At** and press {{key:Enter}}: the run goes straight up or down at the last corner, with an elbow at each end. A riser can go up into the level above. Each level shows the parts of a run its view range reaches, with **UP** or **DN** at the riser.

## Drains and their slope

Sanitary and storm drains start at the smallest slope the International Plumbing Code allows for their size: 1/4 in. per foot up to 2-1/2 in., 1/8 in. per foot from 3 to 6 in., 1/16 in. per foot from 8 in. Brazilian PVC drain pipe starts at the slope of NBR 8160: 2 % up to DN 75, 1 % from DN 100. Type another slope in the bar or in Properties: `1/4"/ft`, `2 %` or `1:50`. The run falls from its first point, so draw drains in the direction they flow. The plan shows the fall and an arrow. Properties warns when a drain is flatter than the code's minimum.

## Size the drains by fixture units

Pick a sanitary drain: **Fixture units** in Properties says how many it carries and the smallest size they need. Every plumbing fixture whose drain connector is on the run counts, and so does every drain that flows into it: draw drains in the direction they flow, each ending on the drain it flows into.

- Drains in Brazilian PVC drain pipe count **UHC** and follow NBR 8160; the others count **DFU** and follow the International Plumbing Code.
- **Drain**: a **Branch** is sized from the code's table for fixture branches; a **Building drain** from its table by slope, so its **Slope** matters.
- A drain is never smaller than the fixture drains it serves (a water closet needs DN 100, or 3 in.), nor than a drain flowing into it. Under NBR 8160 a building drain is DN 100 at least.

{{ui:Size the drains}} makes every sanitary drain of the model that is too small for its fixture units the size it needs, as one step you can undo. A drain drawn bigger than it needs is left as it is. When a drain carries more than the largest size of its pipe can at its slope, BimCraft says so: give it a steeper slope or another pipe.

:::note
In the US tables, stacks are sized as branches and vents and storm drains are not sized. Check them, and the whole design, against the code that applies to the project.
:::

## Stacks and vents (NBR 8160)

In Brazilian PVC drain pipe, stacks and vents are sized too.

**Stacks.** Draw the stack from its top down, ending on the drain it flows into, and set its **Drain** to **Stack**. The branches end on its line. **Fixture units** then uses the stack table of NBR 8160, whose column depends on the building: **Building** says up to three floors or more than three, and starts from the number of levels in the model. A stack is never smaller than the largest drain flowing into it, so one with a water closet is DN 100. A stack that bends more than 45° from the vertical is sized in parts: draw it as separate runs.

**Vents.** Draw each vent from the drain it vents, its first point on that drain, and on up or along: a vent ending on another vent goes into it, and one ending on a stack goes into the stack's vent above. Pick a vent and set **Vent**:

- **Branch vent**: sized by the UHC of the drain it vents, from the table of NBR 8160 for branch vents, which has a column for groups with a water closet.
- **Vent stack or header**: sized by the DN of the drain or stack it serves, its UHC and its length, from the vent stack table. The length runs from the foot of the farthest vent into it to the open end, up the stack's vent when it joins one.

A vent's UHC are those of the drains it and the vents into it vent, each counted once. {{ui:Size the vents}} makes every vent that is too small the size it needs, as one step you can undo.

**Trap to vent.** A sanitary drain with fixtures on it shows how far, along the drains, the farthest fixture's drain connector is from a vent: the foot of the first vent downstream, or a stack. NBR 8160 allows 1.00 m for DN 40, 1.20 m for DN 50, 1.80 m for DN 75 and 2.40 m for DN 100; a longer one is shown in red.

:::note
A vent should rise at least 1 % towards the open end; BimCraft draws vents level unless you give the corners their heights.
:::

## Cold and hot water from a tank (NBR 5626)

Draw the water pipes from the tank out: the first pipe leaves the tank, and every other pipe starts on the pipe that feeds it and ends at a fixture's water connector (or on further pipes). Pick the pipe that leaves the tank and set **Fed from** to a tank, with the **Water level** of the tank (its height above this level).

**Fed from** also says how the design flow of each pipe is found. NBR 5626:2020 does not impose a method: the project chooses one, empirical or probabilistic, recognised or properly founded, and states and justifies it in its report. BimCraft offers two, and says in the file which one the project chose:

- **Empirical flows by weights**: Q = 0.3 √ΣP (L/s), from the weights of the fixtures the pipe feeds, never more than the sum of their design flows. It is the formula of the edition the 2020 one replaced; it is used here only as a method you choose and justify.
- **Every fixture at once** adds up the fixtures' design flows.

Write why you chose it in **Method justified by**: it is saved in the file (`CadCraft_MepRun`, `WaterNote`) and BimCraft reminds you while it is empty.

The design flows and weights of the plumbing fixtures to start from are starting values: water closet with a cistern 0.15 L/s and 0.3, lavatory 0.15 and 0.3, kitchen sink 0.25 and 0.7, shower 0.20 and 0.4, laundry tub 0.25 and 0.7. Take the ones of the fixtures you specify from their makers.

Pick any water pipe fed from a tank to see:

- **Flow**: its design flow, its speed and how much it loses per metre, by the universal (Darcy–Weisbach) equation for water at 20 °C. Faster than 3 m/s is shown in red: NBR 5626 allows it only where water hammer and noise are shown not to matter.
- **Pressure**: the lowest along it and at its end. Fittings of PVC soldável add their equivalent lengths (elbows, tees, valves); in other pipes only the pipe counts. Under 5 kPa is shown in red, except down the drop from the tank to its header.
- Each fixture it feeds: the dynamic pressure at its connector (10 kPa or more) and the static pressure from the water level (400 kPa or less).

{{ui:Size the water pipes}} makes each pipe fed from a tank that runs faster than 3 m/s the smallest size that does not, as one step you can undo. Pressures are not changed for you: give a pipe a bigger size, or raise the tank, where they are short.

:::note
A fixture may need more than 10 kPa: take its pressure from its maker. These checks help the design; the project's engineer chooses the method and signs the report.
:::

## Hydrants and hose reels (IT 22, São Paulo)

A pipe of the **Fire** system is checked as Instrução Técnica 22/2025 of the Corpo de Bombeiros of São Paulo asks (updated by Portaria CCB 003/800/25). Pick it and give:

- **Occupation column** and **Built area**: Tabela 3 of the IT gives the type of system and the fire reserve (RTI, in m³) for the column that holds your occupation and the area band. The column is the project's to choose: its occupations are in the IT's Tabela 3. Or name the **Type of system** (1 to 5; type 4 with the DN40 or the DN65 nozzle), which wins over the table.
- **Hydrants this pipe serves**: the flow is that of the two most unfavourable jets (item 4.8.3), so the type's flow (Tabela 2: type 1 100 L/min, 2 150, 3 200, 4 300, 5 600) for one hydrant and twice it for two or more.

BimCraft then shows the speed (at most 5 m/s, item 4.8.12), the head loss by Hazen–Williams (item 4.8.10.2, with the C factor of Tabela 1: 120 for steel, 150 for copper and plastic) over the pipe's length, and the pressure its start needs for the hydrant at its end: the type's pressure (Tabela 2, in mca) plus the loss plus the rise. The smallest size is DN65 (2½"), or DN50 (2") for types 1 and 2 (item 4.11.6). {{ui:Size the fire pipes}} makes each pipe too small or too fast the smallest size that is not, as one step you can undo.

:::note
Not checked here: fittings and valves in the loss, the pressure at the nozzles against the 100 mca limit (it needs the supply), the reservoir and pump (Annexes B and C), where the hydrants stand (item 4.7), the exemptions of Annex E, and the notes 1 and 2 of Tabela 3 (sprinklers lower the type or the reserve). The project's engineer chooses and signs.
:::

## Storm drains (NBR 10844)

In Brazilian PVC drain pipe, storm drains are sized as NBR 10844 asks. Draw them in the direction the water flows, each ending on the drain it flows into: a downpipe from the gutter down, then the horizontal drains.

Pick a storm drain and give it:

- **Roof area**: the area that drains into it, in m², counted as NBR 10844 counts it (a sloped roof adds half its rise to its width). Leave it empty on a drain that only takes what flows into it.
- **Rainfall**: the intensity of NBR 10844's table for the place and the return period, in mm/h. Empty, it counts 150 mm/h, which the standard allows for up to 100 m² of roof in plan.

The flow is the rainfall on the area, Q = I · A / 60 (L/min), and every drain carries what flows into it too.

- A **Horizontal** drain is sized with the water at 2/3 of its inner diameter (Manning–Strickler, n = 0.011), at its **Slope**: at least 0.5 %.
- A **Downpipe** is sized from the abacuses of NBR 10844 (its Figure 3): set the **Gutter outlet** (sharp-edged or with a funnel) and the **Water in the gutter** (H, 50 to 100 mm). Its length L is how far it falls. BimCraft takes the higher of the diameters the H and L curves give at its flow, interpolating between curves, at least 70 mm inside, and the size whose inner diameter is at least that.

{{ui:Size the storm drains}} makes every storm drain that is too small the size it needs, as one step you can undo. A downpipe off the abacuses (H under 50 or over 100 mm, less than 0.3 m long, or more than 150 mm inside) is not sized: BimCraft says which.

:::note
The abacuses were read from the figure curve by curve; each reading lies within about half a millimetre of the drawn line. Gutters are not drawn or sized here.
:::

## Valves

1. Choose {{ui:Valve}} and the kind: gate, ball, globe or check.
2. Click on a pipe where it goes. The pipe is cut round it and the valve is connected to both sides.

Properties of the run lists its valves, each with {{ui:Remove}}.

## Change a run

Pick any part of a run, in the plan or the 3D view. In Properties:

- **System**, **Material**, **Class** and **Size** (pipes), or **Shape**, **Width**, **Height** (ducts).
- **Height above the level** moves the whole run up or down.
- **Slope** (pipes).
- **Flow** with {{ui:Size it}}: for water, the smallest size that keeps the water at 8 ft/s (2.4 m/s), or 5 ft/s (1.5 m/s) for hot water; at 3 m/s for the Brazilian PVC water pipe (NBR 5626). For ducts, the velocity and friction rate of the duct as drawn. Sanitary drains are sized by their fixture units instead: see **Size the drains by fixture units** below.

Each change is one step of {{ui:Undo}}. {{key:Delete}} removes the whole run.

## Plans

- Pipes smaller than 150 mm (about 6 in.) are drawn as one line on their centre line, larger pipes and all ducts as two lines at their width.
- Each system has its own colour; the plan PDF prints them in black.
- Each run is labelled with its size and system (for example `2" CW` or `16×10 SA`).
- A plan's view range decides which runs it shows, and {{ui:Shown in this plan}} can leave out **Pipes** or **Ducts**: see [Views, view ranges and your own sheets](topic:views-and-sheets).

## Schedules and the takeoff

The {{ui:Schedules}} panel adds **Pipes** (by system, material and size, with their lengths), **Ducts** (by system, shape and size, with lengths and the outside surface area) and **Fittings and valves** (by kind and size, counted). Click a row to pick what it lists; {{ui:Download CSV}} downloads it.

{{ui:Takeoff}} takes the runs along to TakeoffCraft: pipe and duct by size as runs drawn on the plan (sloped drains measured along their slope), fittings and valves counted where they are: see [Send the model's quantities to TakeoffCraft](topic:takeoff). Risers are left out of that sheet, because a plan cannot measure them; the Pipes schedule has their length.

## In the IFC file

Each run is an assembly holding its parts: pipe and duct segments, fittings and valves, each with its type, material, a colour for its system and its ports. Touching ports are connected, and every part belongs to its distribution system (IFC2X3 files get the same as flow segments, fittings and controllers in a system). Other programs that read IFC systems see one connected run per system. The run's own definition is kept with it, so BimCraft makes it again the same way when you change it.
