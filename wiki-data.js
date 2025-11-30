// POI - blue
// Town - blue
// City - Yellow 
// Region - Red

const wikiData = {
	
"Glaskatch": {
    "title": "Glaskatch",
    "type": "City", 
	"image": "assets/Glaskatch.jpg",
    "coords": [-83, 33],
    "content": `
    <em style="color: #555;">"It was the weirdest date of my life. I think she was wearing a 'Witty' shard that had belonged to an old man...? She kept cracking jokes about the price of wool and calling me 'sonny'. I wasn't sure if she was flirting or vetting me for her bridge club."</em><br>
        <strong style="font-size: 0.9em;">- Overheard in a tavern</strong><br><br>
        
        <h3 style="color: #8B0000; margin-bottom: 5px;">The Cathedral of the Resonant Soul</h3>
        Glaskatch is less a city and more a sprawling, hushed sanctuary dedicated to the malleability of the human spirit. While it sits geographically within the quiet winds of Southfield, it operates as an autonomous entity, legally distinct and culturally isolated by its unique industry. It is a city of soft, muted colors and modern, modular architecture designed to dampen sound and emotion. It is a society of precise manners and fluid identity, where the locals are introspective not out of pretension, but because maintaining a coherent self requires constant, quiet effort.<br><br>

        <h4 style="color: #000080; margin-bottom: 3px;">The Communion of Glass</h4>
        The heart of Glaskatch is the economy of the Personality Shard - distilled fragments of memory, instinct, and temperament harvested posthumously via psychic imprinting. To the locals, this is not a crude market of souls, but a sacred practice of preservation. Grief here is processed by capturing a shard of a loved one's "Warmth" or "Joy," allowing the bereaved to literally carry a piece of the departed's soul within a locket. However, the trade extends far beyond sentiment. Artisans graft the instincts of past masters onto their own minds, and diplomats lease the slivers of historic negotiators to navigate treaties. Because this practice is invasive, the culture mandates strict rituals of hygiene, such as Memory Fasting—a voluntary, monastic period where one removes all shards to starve the echoes and reconnect with their "authentic self."<br><br>
        
        <h4 style="color: #000080; margin-bottom: 3px;">The Hierarchy of Resonance</h4>
        Not all souls are equal, and the market reflects this with ruthless precision. Shards are graded by clarity, completeness, and emotional tone. At the apex are the "Pristine" extractions—rare temperament patterns like inspired genius or perfect calm. Below them lie the commercial grades, functional skills bought for labor or war. At the very bottom is the "Static": clouded, low-quality fragments that offer nothing but vague urges and confusion. These "junk shards" sometimes prove to be dangerous, yet they find a ready market among those too poor to afford clarity.<br><br>
        
        <h4 style="color: #000080; margin-bottom: 3px;">The Rot in the Reflection</h4>
        Governance is handled by the Ethics Tribunal, a council of scholars who treat the theft of a shard as a violation of the soul’s sanctity. Yet, the city’s underbelly belongs to The Speculars, radical philosophers who believe reality is a trap. Specifically, the sect known as the Fragmentists, or "The Empty Glass," use Glaskatch’s technology to subtract from the human experience. They purchase "Blanking Shards" to excise trauma and morality, and operate illegal "Psychic Chop-Shops" where memories are surgically removed and desperate addicts are sold low-quality, static-filled shards that slowly erode their sanity.<br><br>
        
        <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
        &bull; <strong>The Hollow Men:</strong> A series of comatose victims have been found in the alleys, physically unharmed but mentally hollowed out. The Fract Court suspects a Specular cell is harvesting "living shards"—stealing the souls of the living to fuel their "Ascension" rituals.<br>
        &bull; <strong>The Counterfeit Soul:</strong> A flood of high-quality "Mastery" shards has hit the market, offering incredible sword-skills for a suspiciously low price. Users are reporting blackouts and violent outbursts, potentially pointing to a lab creating artificial, unstable souls that consume the user from the inside.<br>
        &bull; <strong>The Bleeding Locket:</strong> A wealthy patron purchased a rare "Heroic Impulse" shard for his son, but the shard is corrupted. The "hero" inside is screaming, and the boy is now prone to violent, righteous outbursts that belong to a dead warlord.
    `
},
//    "river_crossing": {
//        "title": "The Old Bridge",
//        "type": "POI",    // <--- This triggers the Small Blue Icon
//        "coords": [-30, -94],
//        "content": ``
//    },
//	    "Glenroot": {
  //      "title": "Glenroot",
    //    "type": "Town",    // <--- This triggers the Small Blue Icon
      //  "coords": [-30, -97],
        //"content":``
//    },
	    "haldrith": {
        "title": "Haldrith",
        "type": "Region",   // <--- This triggers the Large Red Icon
		"image": "assets/Haldrith.jpg",
        "coords": [-23, -94],
        "content": `
		<em style="color: #555;">I have reviewed your report regarding the bedrock density in Sector 4. You claim the stone is too hard to drill on schedule. Let me remind you where you stand, and what your contractual obligation is. I do not care if you have to melt the granite or break every drill-bit in your inventory. We have a contract with the Ledgerwind to open that tunnel by the solstice. Fix the gradient, Vask, your excuses and geological condition are of no interest to me.</em><br>
            <strong style="font-size: 0.9em;">- Memorandum: Site 4 Delays, Mokash Hammerhand, Foreman of the Iron Guild</strong><br><br>
            
            <h3 style="color: #8B0000; margin-bottom: 5px;">The Land of Negotiated Order</h3>
            Haldrith is a region defined by the grind. It is a dense, industrious highland where the terrain itself seems to have been bullied into submission by centuries of construction. There is no inherited nobility here, and certainly no patience for idle hands. It is a society held together by the ink of a thousand contracts and the sweat of its guilds.<br>
            The demographics reflect the geology. This is the ancestral stronghold of the Dwarves and Rock Gnomes, whose lineages have dug deeper into the mountains than any human empire could bother to map. Here, the “Short Folk” are the giants of industry. Members of other races are present, mostly Humans and Orraks (serving as heavy labor or mid-level management) but the architecture of Haldrith is built to a denser, lower scale. A six-foot human often walks with a stoop in the older district tunnels, a subtle reminder of who built the foundations.<br>
            The atmosphere is one of perpetual motion. The society is practical to the point of ruthlessness; honor exists, but it is tied to competence and contractual integrity rather than bloodline. A family name means nothing compared to a guild affiliation or apprenticeship papers.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">History</h4>
            Before the Fracture Wars, Haldrith was a collection of feudal duchies loyal to the Remosan Empire. When the Empire shattered and the supply lines were cut, the dukes had proven themselves useless, but the workshops did not. The nobility, unable to eat titles or defend their borders with lineage alone, were not overthrown, they were simply made obsolete. The Dwarven clan-lords and Gnomish trade-barons, possessing the tools, the walls, and the organized manpower, stepped in to keep the region from dying out.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">The Nonagon</h4>
            Governance in Haldrith is a chaotic, high-stakes ecosystem coordinated by The Nonagon, a council of nine powerful guilds that have clawed their way to the top. Their authority is the only law that spans the region, yet even they are not a monolith. The seats range from logistics unions and crafting houses to ruthless espionage networks and magical regulation boards.<br>
            Representation is rarely democratic. Some guilds elect their leaders, while others decide succession through bidding wars, backroom duels, or silent coups. Major decisions such as the founding of new settlements or shifts in trade law, require a majority vote from the Nonagon followed by a public ratification by recognized town leaders. It is a system designed to ensure that power is earned, not given freely. Conflict is common, ritualized into arbitration duels or sanctioned sabotage to keep the gears running while tuning the machine.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">The Modular Sprawl</h4>
            Haldrithian architecture is an exercise in aggressive adaptability, heavily influenced by Gnomish ingenuity. The towns do not sprawl organically; they are built with modularity in mind. Buildings are constructed to be disassembled, upgraded, or moved entirely. In the mountainous settlements, entire districts cling to rock faces or ride along massive cable networks and gear-platforms, allowing the city to shift its shape as industry demands.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Engineered Magic</h4>
            In Haldrith, magic is not a mystical art; it is a part of the manufacturing process. The region favors enchantment over raw spellcasting, embedding arcane function into tools, roads, and defenses. Artificers and stonebinders are the celebrities of this age, respected far more than sorcerers. However, innovation is tightly leashed. Magical use is strictly licensed and guild-restricted. A rogue mage casting unsanctioned spells is viewed less as a heretic and more as an transgressor - liable to be sanctioned, fined, or forcibly recruited.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Tenth Seat:</strong> Rumors are circulating in the lower workshops of a rogue guild that has been aggressively consolidating smaller unions. They aren't seeking to join the Nonagon; they are gathering enough leverage to force a tenth seat at the table, a move that would destabilize the entire voting economy.<br>
            &bull; <strong>The Binding Clause:</strong> A new form of contract-magic has surfaced in the black markets of Fallmere. It doesn't just bind a signatory to a task; it binds their loyalty emotionally. The implications of a workforce that literally loves their servitude has the Ledgerwind terrified, or perhaps, interested in acquiring the patent.<br>
            &bull; <strong>The Split:</strong> A prosperous town on the edge of Stenvik’s influence is attempting to secede from its founding guild to join a rival. The Forge Chain has deployed “arbitration enforcers,” and the town is hiring independent swords to ensure their “sovereign negotiation” doesn't end in a massacre.
		`
    },
    "molakar": {
        "title": "Molakar",
        "type": "Region",
		"image": "assets/Molakar.jpg",
        "coords": [-82, 117],
        "content": `
            <em style="color: #555;">“Come on, Lenny. I know you're tired, but even that shell won't protect you from that hail storm. Up-up, boy! We have to reach Ravelstead before the weather changes on us again. You get us there, I get you a carrot. Deal?”</em><br>
            <strong style="font-size: 0.9em;">- Jek, Strider-Rider, muttering to his mount</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Land of Contradiction</h3>
            Molakar is a desert defined by a frozen juxtaposition. It is a vast, arid expanse where the sun beats down on dunes that sit right alongside deep, permanent scars of unnatural cold known as Molakar Veins. These deep, crystalline valleys, where the temperature sits permanently below freezing, cut through the burning sands like blue arteries. But the air between the heat and the cold is never still. The clash of temperatures creates a violent, volatile atmosphere. “Thermal Gales” erupt with little warning, blasting the dunes with freezing winds that can turn a man to ice mid-stride. Hailstorms strike regardless of the season, shattering glass and bone alike. Even the ground is unstable; a dune might bake in the sun all day, only to flash-freeze into a rigid, slippery mountain of ice at night, then melt into a treacherous slurry by dawn.<br>
            Life here is built on the edge of this thermal shock. The locals cluster their villages along the rims of the Veins, using the desert sun to grow hardy, heat-resistant crops, while relying on the frozen valleys below for their only source of water. It is a harsh existence. The danger lies not just in the weather, but in crossing the “thermal line” unprepared.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Interrupted Miracle</h4>
            During the Sundering, the god Thirekhet descended upon this burning land. He sought to remake the desert into a sanctuary of silence and cool reflection. He began by freezing the groundwater and cooling the stone, but he vanished before the work was done. Molakar is the result—a landscape frozen in the middle of a divine transformation. The heat and the cold do not fight; they simply coexist, locked in a stalemate that has lasted for centuries.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Governance of the Clanholds</h4>
            There is no central throne in Molakar. The region is populated by small, ancient villages that cling to the Veins or the rare geothermal vents. Political power lies with the Clanholds, extended family networks that control the extraction of ice and the trade routes. The only settlement large enough to be called a town is Ravelstead, and it sits far on the western edge, acting as a trade-port for outsiders rather than a capital. The interior belongs to the clans, who govern themselves by the “Law of Shelter”—the sacred obligation to aid anyone caught on the wrong side of the thermal line.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Strider Caravans</h4>
            Survival and travel are made possible by the Strider-Tortoises. These massive, mild-mannered reptiles possess unnaturally long, spindly legs that elevate their heavy shells nearly ten feet off the ground. This evolution keeps their bodies suspended in the “safe air”—the temperate gap between the scorching sand and the freezing winds. They are the ships of the desert, plodding steadily across the thermal lines carrying immense loads of trade goods, water-ice, and riders on their backs. Without them, trade between the Clanholds would be impossible.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Thermal Magic</h4>
            Magic here is defined by temperature. Fire magic is common and reliable, often used by the clans to heat their homes at night or drive the glass-forges. Ice magic, however, behaves strangely near the Veins. It is amplified by the lingering presence of Thirekhet, often becoming too potent to control. A simple cooling cantrip can accidentally freeze a limb solid if cast too close to a Vein. Occasionally, a child is born “Cold-Touched”—immune to the freezing temperatures of the Veins. These individuals are vital to their clans, acting as deep-miners who can descend into the coldest parts of the valleys to retrieve the purest ice without needing protection.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Expanding Vein:</strong> A well-mapped Frost Vein has suddenly begun to widen. The ice is creeping outward at a meter a day, threatening to swallow a centuries-old village. The elders believe something—or someone—has woken up deep in the ice and is trying to finish the god's work.<br>
            &bull; <strong>The Glass Tomb:</strong> A sandstorm recently scoured away a dune, revealing a massive, perfect dome of blue glass. It has no doors, but those who touch it claim to hear a heartbeat slowing down. The clans are arguing over whether to break it open or bury it again before the rumor spreads.<br>
            &bull; <strong>The Fire-Thief:</strong> A rogue sorcerer has been stealing the “geothermal hearts” (magical heat-sources) from local villages, leaving them unable to survive the freezing desert nights. The PCs are hired to track him into the deep desert before the sun goes down.`
    },
    "kelarra_peaks": {
        "title": "Kelarra Peaks",
        "type": "Region",
		"image": "assets/Kelarra.jpg",
        "coords": [-69, -128],
        "content": `
            <em style="color: #555;">You know, I dropped a wrench yesterday. I watched it fall for a full minute before it disappeared into the clouds below. The air is so thin up here that you have to breathe slowly, deliberately, or you pass out. It forces you to be calm. I think that's what I needed. Please stop sending letters asking when I'm coming down. I’m not. Tell Ma I’m safe.</em><br>
            <strong style="font-size: 0.9em;">- Letter from Kael, Novice at the Halos temple</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Archipelago of Stone</h3>
            The Kelarra Peaks are not merely a mountain range. It is a massive archipelago of stone islands floating in the upper atmosphere, separated from the earth by miles of empty sky. While life here is dangerous, it is not dour; it is defined by a thrilling, terrifying freedom. There is a vertical hierarchy to Kelarra. The lower slopes are wet and shadowed, home to the “Drowned Archive” of Vannoch. But as one ascends, the islands become smaller, wilder, and more prone to “The Drift.” Bridges here are not made of stone, but of tension-wire and engineered vines. Travel is not a commute; it is a sport. To live in Kelarra is to accept that the horizon is always moving, and that the only thing keeping your home from floating into the void is your own skills and a measure of luck. Resources here are scarce; everything must be airlifted or grown on tiny pieces of land.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Great Drift</h4>
            During the Fracture Wars, while Haldrith dug in and Remosa marched, Kelarra simply... let go. As the tectonic plates of the continent groaned under the stress of the weaponized magic below, the magic inherent in the peaks reacted violently, snapping the geological anchors and sending entire mountain chains drifting upward. The isolation was immediate. The war could not reach them, but neither could supplies. The survivors were forced to adapt to a life without solid ground, turning from miners and goat-herders into glider-pilots and wind-weavers. Survival demanded a new kind of engineering, giving birth to the Anchor Culture. Every floating island requires a central Gyre-Spike - a massive mechanical and magical tether that regulates the island's altitude and prevents it from drifting into the uninhabitable upper atmosphere. Low floating islands (also called Anchors) are relatively stable and safe. This is where the farms and craftsmen sit. In contrast, high anchors are prestigious, volatile peaks. The higher an island, the harder the Anchor is to maintain. Those who live at the top of the peaks are highly respected for their bravery. They are the ones literally holding the community together against the pull of the sky.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Law of Altitude</h4>
            Kelarra is a loose confederation of independent city-states, bound together only by the Halcyon League. Because the League controls the banking and the mail, they are the de facto arbiters of the peaks. However, the day-to-day rule is meritocratic. Towns are often run by the Engineers who maintain the Anchors or the Masters of the local Monasteries. It is a society of voluntarism. If you don't like the rules of one peak, you can simply glide to another. This has bred a culture of fierce independence and hospitality. You don't turn away a traveler in Kelarra, because tomorrow, the wind might shift, and you might be the one knocking on a door.<br><br>

             <h4 style="color: #000080; margin-bottom: 3px;">The Thinning of Reality</h4>
             Magic in the Peaks is pervasive, governed by height, air, and memory. The higher one ascends, the thinner reality becomes. Wind currents carry sounds for kilometers, sometimes delivering whispers before the words are even spoken. At the highest altitudes, “Echoes” are common—visual afterimages of people or places that persist for minutes after the reality has moved on. It isn't necessarily dangerous, just confusing; locals learn to wait for a person to speak before waving hello.<br><br>

             <h4 style="color: #000080; margin-bottom: 3px;">Architecture & Demographics</h4>
             Since weight is the enemy, there are no stone castles here. Buildings are constructed from hollowed bone, treated canvas, light-wood, and aerodynamic resin. Many structures hang below the islands rather than sitting on top, acting as counter-weights to stabilize the landmass. Every roof is designed to funnel wind into turbines, and almost every home features a “launch porch.” Entering a house often means landing on it.<br>
             The population is a mix of those born to the sky and those who sought to escape the world below. Humans and Elves are the most common residents, often adapted with glider-suits and lung-training. There is also a significant population of Myrrkin who migrated from the nearby Myrskov woods, finding the dreamlike logic of the drifting peaks comforting. Varnathi are also common here. While the peaks are magical, the altitude lifts them above the “polluted” arcane static of the war-torn lowlands. For a Varnath, the magic here feels clean, humming with a pure resonance rather than the jagged noise of the south.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Snap:</strong> During a storm, the secondary chain of Oakhaven Peak snapped. The island is now listing heavily to the side, and the primary Anchor is overheating. The town needs a team to traverse the underside of the island and manually re-engage the emergency clamps before the whole town flips upside down.<br>
            &bull; <strong>The Drifting Monastery:</strong> A remote monastery, known for its extreme discipline, has gone silent. But the peak hasn't drifted—it has risen higher, into the “Red Zone” where the air is too thin to breathe without magic. The locals fear the monks didn't die—they transcended (or succumbed to a collective high-altitude hallucination) and are taking the mountain with them.<br>
            &bull; <strong>The Salvage Run:</strong> A “Wild Peak”—an unanchored chunk of rock from the pre-war era—has drifted into range of the trade routes. It’s teeming with ancient, pre-Fracture ruins. By maritime law, the first crew to plant a flag and a temporary Anchor claims the salvage rights. But three different crews are already suiting up.`
    },    "knotsreach": {
        "title": "Knotsreach",
        "type": "Region",
		"image": "assets/Knotsreach.jpg",
        "coords": [-55, -112],
        "content": `
            <em style="color: #555;">Ma, Don't use the map Dad bought, it's useless past the ridge. When you reach the split rock, turn left, but only if the moss is yellow. If it’s green, sit down and have lunch until it shifts. After that, walk until the wind feels warm on your neck, then stop. Do not follow the deer trail, even if it looks faster. Just wait there and shout my name. I’ll come get you. It’s not far, just... tricky.</em><br>
            <strong style="font-size: 0.9em;">- Letter found in a mud-stained envelope near the border</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Land of the Wending</h3>
            Knotsreach is a region where reality resists mapping. It is a rugged highland of jagged hills and deep forests where the terrain suffers from a chronic, low-grade instability known as The Wending. It is a nauseatingly beautiful landscape where the laws of physics seem to have softened. Trees do not just grow up; they spiral, loop, and knot around themselves. Rivers might flow uphill for a mile before correcting, or curl into perfect circles that lead nowhere. Navigating this chaos is impossible for the rigid-minded. There are no reliable maps, because the land shifts too frequently for ink to keep up. Survival here requires one of two things: a scholarly, almost mathematical understanding of the chaotic patterns, or an extremely sharp intuition. Travelers those who rely only on their eyes and strict logic find themselves walking in circles until they starve.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">History</h4>
            During the Fracture Wars, this region was a testing ground for experimental transportation magic. When a massive divine teleportation ritual failed, the resulting backlash didn't just break the spell - it tangled the local geography into a metaphysical knot that has never come undone. The land has always had a wild, unyielding reputation to it. But since the incident, it is rumored to be a living being, actively resisting to being “solved” ever again.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Governance of the Empty Wilds</h4>
            Most sensible people avoid Knotsreach entirely, crossing it only if they have absolutely no other choice. There is no central government here, mostly because there is not much to govern, and any attempt to take over would be a logistical nightmare. There are a few tiny communities, but they mostly keep to their own. The only true settlement is Luznica, and even that sits safely on the stable outskirts bordering Haldrith. It serves as a staging ground for the brave or foolish, functioning as a scholarly hub for those studying the Wending from a safe distance. Beyond Luznica, there is nothing worth being called a civilization.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">The Unfound</h4>
            The population of Knotsreach consists almost entirely of people who do not wish to be found. Fugitives from Haldrith or the Compact often flee here, knowing that the Wending serves as a perfect, shifting protection against pursuit. They share the deep woods with those who view the chaos as a holy thing - Druid circles and Ranger conclaves who have learned to move with the land rather than against it. The only others foolish enough to stay are the researchers, small cabals of rift-scholars who set up temporary field labs to study the volatile physics, often vanishing when their curiosity proves deadly.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Magic of Orientation</h4>
            Magic here is erratic. Spells of orientation and location are highly unstable; a simple Find Path spell is more likely to cause a migraine than point North. However, the region is a haven for Druidic and Ranger magic that relies on harmonizing with the environment rather than dominating it. The land seems to respect those who listen to it, while punishing those who try to force it into a grid.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Dual Letters:</strong> A researcher vanished into a localized “Knot” months ago. Now, his family is receiving letters from him. The problem is that the letters are coming from two different locations simultaneously, and they describe two completely different expeditions.<br>
            &bull; <strong>The Straight Road:</strong> The Nonagon of Haldrith has hired a team of earth-mages to brute-force a straight trade road through the edge of Knotsreach. The land is reacting violently. Mudslides are burying camps, trees are growing through stone in hours, and the workers are reporting a collective, crushing sense of dread.<br>
            &bull; <strong>The Untying:</strong> Deep in the Wending, a group of radical scholars believes that the shifting world is the true state of existence. They are performing rituals to actively untie stable areas, trying to erase the static geography of the outside world to match the chaos inside.`
    }, "Rivhalde": {
        "title": "Rivhalde",
        "type": "Region",
		"image": "assets/Rivhalde.jpg",
        "coords": [-28, 4],
        "content": `
  <em style="color: #555;">“I’ve run the numbers on Rowanholt. Their buckwheat output is down 12% this quarter. If we deploy a Lienhunter squad to clear out the goblins, the cost of the operation exceeds the village's projected tax revenue for the next five years. Let it burn. We can repossess the land once the goblins move on.”</em><br>
            <strong style="font-size: 0.9em;">- Senior Auditor Richard, denying a request for aid</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Asset Portfolio</h3>
            Rivhalde is the breadbasket of stability in a fractured world, but it is perhaps better described as a diversified portfolio than a nation. To the casual observer, it is a peaceful land of rolling golden plains, patchwork farmland, and cool rivers, linked by well-maintained cobblestone roads that are safe enough for a child to walk alone. There are no monsters here, no rifts, and no war. But peace is merely a product, and the citizens are paying a premium for it. The Greywater Compact views the entire region not as a homeland, but as a balance sheet. Every bushel of wheat is counted, every traveler is logged at toll-bridges, and every acre of land is bound by a dense web of contracts. The atmosphere isn't one of fear, but of suffocating transactionality. Order is maintained strictly because chaos is bad for business. A village that riots is a village that isn't harvesting, so dissent is crushed with the same dispassionate efficiency as a pest infestation.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Rise of the Compact</h4>
            When the rest of the world burned during the Fracture Wars, Rivhalde survived by doing the one thing no one else could manage: logistics. While generals fought over ruins, the merchant families of Rivhalde secured the granaries and the river-ports. They formed the Greywater Compact, a trade consortium that effectively bought the region’s safety. They didn't win the war; they monetized it. By controlling the food supply and the safe trade routes, they forced neighbors to sign non-aggression pacts. Today, the Compact functions as a corporate state, promising safety and infrastructure in exchange for absolute adherence to their ledger and their profit margins.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Governance: The Lienhunters</h4>
            The region is ruled by the Board of Signatories, a rotating council of high-merchant families and syndicate leaders who meet in the capital of Krumfeld. Their laws are civil, not criminal. Theft is not a sin; it is an unauthorized transfer of assets. Murder is the destruction of human capital. Since the Compact has no standing army, they enforce their will through Lienhunters. These are not government agents; they are ruthless private mercenaries operating on a personal contract basis. When a village rebels or a merchant refuses to pay their tariffs, the Board issues a “Correction Contract.” A Lienhunter crew picks it up, rides out, and handles the problem with whatever violence is necessary to close the ticket. They are feared more than any soldier, because they don't fight for a flag, they fight for a payout. And they’ll stop at nothing until the debt is cleared.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">The Friction</h4>
            This obsession with profit has created a deep, simmering resentment. Because the Compact views people as resources, they often squeeze communities until they break. This has birthed a quiet but growing resistance. Black markets and smugglers move untaxed grain through “Ghost Roads” to feed the poor, and underground cells of “Ledger-Breakers” work to sabotage the Compact’s archives, burning debt records to free indentured families. The region is stable on the surface, but underneath, it is a class war waiting for a spark.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Commercial Arcana</h4>
            Unlike some of its neighbors, Rivhalde does not fear magic; it sells it. The region has the loosest magical laws in Virelia, provided you can afford the premiums. The Compact views spellcasting as a high-value service industry. There are no bans on necromancy or evocation, only “Hazard Tariffs.” A wizard is free to cast Fireball in a duel, provided they have purchased the appropriate “Collateral Damage Insurance” beforehand. Farmers hire weather-mages to summon rain, and merchants hire illusionists to spice up their storefronts. The only crime is “Uninsured Volatility” - casting a spell you cannot pay to clean up. Consequently, Rivhalde attracts a lot of loose-cannon mages who were banned from Haldrith or Remosa, eager to work in a place where their power is measured solely by their credit score.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Unsanctioned Harvest:</strong> A remote village has produced double its expected yield using “Open Source” druidic magic rather than the Compact’s patented “Growth-Accelerant” scrolls. The Compact views this as intellectual property theft and has hired the party to “audit” the druid responsible.<br>
            &bull; <strong>The Repo Job:</strong> A Lienhunter crew hires the party to help repossess a “High-Value Asset” from a fortified manor. The asset turns out to be a living person—a runaway heir who signed away their freedom in a bad deal, now protected by a local resistance cell.<br>
            &bull; <strong>The Ghost Road:</strong> The party stumbles upon a smuggling route used to move untaxed magical artifacts into Trefgann. The smugglers offer the party a cut to look the other way, while a Lienhunter patrol is closing in to “liquidate” the operation.
			`
    }, "Tintbent": {
        "title": "Tintbent",
        "type": "Region",
		"image": "assets/Tintbent.jpg",
        "coords": [-35, 72],
        "content": `
             <em style="color: #555;">Entry 204: The Turncoat Vine ( Vitis Contravius ) A parasitic creeper characterized by aggressive Contrast. To maximize energy absorption, the vine’s pigment shifts instantly to the exact inverse of the ambient light. If the sky burns Red, the vine turns Teal. If the sun shifts Yellow, the vine snaps to Indigo. Makes for fine tea! Field Warning: Do not traverse dense patches during rapid light-storms. The strobing clash between sky and ground destroys depth perception and induces severe vertigo. Harvest only in total magical darkness.</em><br>
            <strong style="font-size: 0.9em;">- Excerpt from Flora of the Broken Spectrum, Vol IV.</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Vibrant Basin</h3>
            To the uninitiated, Tintbent is a migraine waiting to happen. It is a basin of oversaturated, impossible colors where the grass might be neon teal and the shadows glow with a faint, radioactive hum. But to the locals, this is a land of aggressive, bountiful life. The light here is heavy and broken, refracting around solid objects and lingering long after sunset. But nature has adapted to turn this chaos into fuel. Agriculture here is not about seasons, but about the utilization of the chaotic spectrum of light. Farmers grow “Flash-Corn” that matures in hours under intense yellow surges, or harvest “Eclipse-Lilies” that only bloom in the false dark of a shadow-storm. The fauna is equally adapted; Mirrasheep graze the plains, their wool acting as a natural reflector to bounce away the noon heat. Life in Tintbent isn't miserable; it is hyper-active, vibrant, and occasionally strangely beautiful, provided you respect the fact that a sunburn here can turn your skin into glass.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Abandoned Utopia</h4>
            Long ago, this region was the seat of the God of Light. It was not a wild place then, but a constructed paradise. A perfect prism where divine law ensured that light behaved with absolute, crystalline mathematical precision. It was a colorful utopia of light architecture and eternal, gentle days. But when the God vanished during the Sundering, the “physics engine” of the region was left running without an operator. Over centuries, the precise mathematical laws of optics began to drift. The perfection slowly unspooled into chaos.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Governance of the Prism</h4>
            The population of Tintbent is too sparse and the daily task of managing the light too consuming to support a bureaucracy. Instead, the basin is dotted with isolated homesteads and small, tight-knit communes that have anchored themselves to specific “Soft Zones,” adapting their lives entirely to the local light conditions. These settlements are studies in “visual silence.” Buildings are constructed from dull stone and washed clay to minimize reflection, and the locals wear heavy layers of matte-grey fabric to avoid adding color to an already chaotic world. Not many choose to live here, so people are suspicious towards new faces, and disputes are resolved quietly between neighbors.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Optical Magic</h4>
            Magic here is dangerous because it adds energy to a system that is already overflowing. Illusion magic is erratic; a simple Invisibility spell might refract into a blinding strobe light. Instead, the locals practice Prismancy - the manipulation of light via physical tools. Builders use focused lenses to cut stone with sunlight, and guards use mirrors to blind predators. However, the greatest threat is the Light-Lag. In certain deep basins, the light moves slower than time. A hunter might see a beast standing on a ridge, only to realize the beast left ten minutes ago, and the image is just a delayed echo. Combat in Tintbent requires fighting where the enemy is, not where they appear to be.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Indigo Harvest:</strong> A village is preparing for the “Indigo Surge,” a rare light event that happens once every decade, causing their most valuable cash crop to bloom. However, a cloud of “Null-Fog” (a weather phenomenon that blocks all light) is drifting toward them. They hire the party to use wind magic or technology to move the fog before they lose their livelihood.<br>
            &bull; <strong>The Lagging Thief:</strong> A bandit is using the Light-Lag phenomenon to rob caravans. He attacks in areas where visual echoes are strong, making it impossible for guards to target him effectively. The party must figure out how to fight a man who is never quite where he looks to be.<br>
            &bull; <strong>The Sunken Garden:</strong> An earthquake has cracked open a “Hard Light” vault from the era of the Light God. Inside is a pristine, untouched garden of pre-Sundering flora, perfectly preserved. Scholars, alchemists, and collectors are flocking to the site, but the ancient light-construct guardians have woken up, and they don't recognize the new world.
			`
},
"Lastrago": {
        "title": "Lastrago",
        "type": "Region",
		"image": "assets/Lastrago.jpg",
        "coords": [-69, 107],
        "content": `
                         <em style="color: #555;">“Everything is wet. My boots are molding while I wear them. The paper in my ledger is turning to mush. I have to oil my sword three times a day or it rusts in the scabbard. I hate this place. But you have to hand it to them… that’s some fine cinnamon.”</em><br>
            <strong style="font-size: 0.9em;">- Sheylok Genn, merchant</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Drowning Jungle</h3>
            Lastrago is a land of verdant jungle, heavy rains, and constant growth. Even without the Sky-Rivers, tropical storms feed its forests and floodplains. But above this lush baseline drift the Sky-River Cascades - colossal storm-bands born in the cataclysm of the Mazurat, when the sky itself tore open during the Sundering. Since that day, rivers of rain have flowed across the heavens, unpredictable and destructive. They can drown entire districts in a night, collapse roads, and smother fields beneath choking growth. The jungle thrives everywhere, but human life survives only through those who can read the rivers’ paths: the Mazuren. The Mazuren rule as both shield and arbiter. They decide where to plant, when to travel, which districts to abandon. Their authority is absolute - yet always conditional, for one failed prediction can destroy a city.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Prophets of the Rain</h4>
            In a land where the weather kills, the meteorologist is king. Governance is held by the Mazuren, a priesthood of storm-marked seers who rule not through divine right, but through accuracy. The Mazuren are equal parts mystics and mathematicians. They maintain vast Rain-Archives, cisterns of consecrated water collected from past cascades. By tasting these waters to sense “memory,” and cross-referencing them with complex hydrological charts, they predict where the Sky-Rivers will break. A Mazuren’s honor is tied entirely to their forecast. If they are right, they are hailed as saviors. If they fail, they are disgraced. A priest who miscalculates a flood must choose between exile or The Second Drowning - undergoing the deadly initiation rite again to see if the sky still accepts them.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">The Storm-Marked</h4>
            The ability to sense the rivers is a biological anomaly unique to Lastrago, viewed as both a blessing and a terrible burden. Occasionally, a child is born Storm-Marked. Bearing shimmering eyes, static-charged hair, or skin that weeps water when a cascade is overhead. For a family, this is a moment of terrifying pride. To have a Storm-Marked child is the highest honor in Lastrago, a guarantee of social elevation. But it also means surrendering the child to the Rite of the Drowning Sky. Initiates are strapped to the highest spire of a temple and exposed directly to a breaking cascade. It is a brutal filter; the water crushes the weak and drives the fragile mad. But those who survive emerge changed, possessing the “Hydrological Sight” required to lead. It is a culture that willingly sacrifices its children to the rain so that the rest may stay dry.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Architecture: The Canopy Citadels</h4>
            In Lastrago, the ground is merely a foundation for the stilts. Cities like Azwighen are triumphs of years of struggle against the coming rains. Buildings are constructed on massive pylons of petrified wood or stone, rising high above the “Mud Line” to avoid the flash floods. The roofs are the most critical feature: steep, scaled pitches designed to shed tons of water in seconds. A flat roof under a Sky-River collapses instantly. Instead, every structure acts as a funnel, directing the deluge into massive, city-wide aqueducts that roar beneath the elevated walkways during a storm. To live here is to live inside a machine designed to survive a waterfall.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Barktrail</h4>
            Because the ground is a muddy, overgrown hazard, trade flows along the Barktrail —a massive, elevated highway system built on stilts and the backs of giant, petrified roots. This is the lifeline of the region, moving rare spices, medicinal herbs, and “Rain-Salts” (crystallized mana harvested from the cascade pools) to the markets of Trefgann and Molakar. The trail is maintained by the Mazuren, whose rites “anchor” the cascades overhead to ensure they don't break directly onto the road.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Black Cascade:</strong> A new Sky-River has appeared, but the water is dark and oily. Where it falls, the jungle dies and rots instantly. The Mazuren of Azwighen are paralyzed, unable to predict its movement because their math cannot account for this “dead water.” They hire the party to fly up to the source to see what is polluting the sky.<br>
            &bull; <strong>The False Prophet:</strong> A popular young priest in Tinzarit has been predicting floods with 100% accuracy, saving thousands. However, a rival council suspects he isn't using the Archives or Visions, but instead he is summoning the rain using an artifact from The Mire, forcing the math to fit his predictions.<br>
            &bull; <strong>The Lost Caravan:</strong> A Trefgann trade caravan carrying iron tools never arrived at the depot. They were last seen on a section of the Barktrail that supposedly “moved” during a storm. The party must navigate the flooded jungle floor to find the wreckage before the swamp-stalkers do.
			`
},
"Trefgann": {
        "title": "Trefgann",
        "type": "Region",
		"image": "assets/Trefgann.jpg",
        "coords": [-73, 37],
        "content": `
                         <em style="color: #555;">“The Golden Man came down the hill, He came to take, he came to kill. He knocked upon the Iron Gate, We told him he would have to wait. He huffed and puffed and broke his bone, and now we use his head for stone! One step! Two step! Three steps! Four! Don't come knocking at our door!”</em><br>
            <strong style="font-size: 0.9em;">- Playground skipping-song heard in Veydran</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Reclaimed Heartland</h3>
            Trefgann was once a large province of the Remosan Empire. A land of marble plazas, triumphal arches, and endless barracks. Today, it is a landscape of grand ruins repurposed by simple needs. The marble plazas are now marketplaces for local farmers; the triumphal arches serve as trellises for ivy and beans; and the barracks have been subdivided into family homes. Yet, beneath the domesticity, the infrastructure remains weaponized; The sewer still rigged as potential ambush tunnels, and the ivy often hides old tripwires. It is a region defined by a proud hardy pragmatism. The people here are not soldiers by trade, but they can hold their own. They are farmers, masons, and smiths who have learned that while they cannot match a legion in the open field, they can make them bleed for every inch of grass. They hold a deep, generational hatred towards the Remosan empire, and view it, perhaps rightfully so, as a violent, arrogant occupier that refuses to die. Every Trefganner is raised with the knowledge that eventually, the legions will march south again, and he’d have to be ready when the time comes.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Synod of Secession</h4>
            Trefgann did not fall during the Sundering; it endured the chaos of the Age of Silence alongside the rest of the empire. But when that age collapsed into the brutality of the Fracture Wars, the cities of the heartland had had enough. Refusing to feed an empire that turned its war machine against its own people, the local mayors and guild-masters declared the Synod of Secession. Slamming their gates shut against the Remosan remnants. he Empire never forgave them. Three times Remosa has marched to reclaim its territory, and three times the Synod has rallied enough unity to drive them out. This history has bred a culture of fierce neighborhood loyalty. A Trefganner might argue with their neighbor over a fence line, but if an outsider threatens the village, the argument ends and the weapons come out.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Governance: The Common Defense</h4>
            Authority in Trefgann is intentionally fragmented to prevent any new “Emperor” from rising. The region is loosely coordinated by the Synod of Secession, a council that exists solely to settle trade disputes and organize defense during invasions. In peacetime, power rests entirely with the locally elected leaders of semi-independent city-states like Veydran, Braemarch, and Torvan’s Hold. These cities are not ruled by dukes or generals, but by elected Mayors, Town Councils, or Guild Elders. It is a “quiet” governance; taxes are low, laws are local, and the militia is voluntary. However, every citizen is expected to answer the call if needed.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Magical Context</h4>
            Trefgann’s landscape is scarred by the magic of the past. Collapsed citadels leak lingering arcane radiation, and some ruins are trapped in time-echoes, rebuilding themselves halfway before crumbling again. The locals have little patience for high wizardry. While not illegal, they have bitter stories of the battle-mages of old, and it is viewed as the type of weapon a coward might use. They do appreciate spellcraft that can assist in the day-to-day life. A cleaning prestidigitation spell has never killed anyone, but can save a person plenty of work.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Sleeper:</strong> A massive war-construct from the First Reconquest has been discovered buried in a farmer’s field. It is dormant, but its core is still hot. The farmer wants to dismantle it for parts to build a mill, but the local Council fears that touching the core might trigger a self-defense protocol that could level the town.<br>
            &bull; <strong>The Boundary Stone:</strong> Two neighboring towns are on the brink of a feud over a newly discovered underground spring. Both towns claim their ancestors dug the original well. The Synod hires the party not to judge the law, but to find a solution that keeps the peace before the “neighborly defense” turns into a civil skirmish.<br>
            &bull; <strong>The Fourth March:</strong> Scouts report that Remosa is massing troops on the southern border again. But this time, they aren't marching with an army; they are sending “Inspectors” - bureaucrats backed by heavy guards, claiming they are there to “audit imperial property.” The Trefgann militias are confused and hesitant to attack “civilians,” but the Inspectors are seizing grain silos.
			`
},
"Southfield": {
        "title": "Southfield",
        "type": "Region",
		"image": "assets/Southfield.jpg",
        "coords": [-82, 51],
        "content": `
		     <em style="color: #555;">“I spent an hour yelling my price at the village elder. He just sat there, peeling an apple. Didn't say a word. Finally, he cut a slice, pointed at my wagon, and held up three fingers. I took the deal. I don't even know if I won or lost, I just wanted him to fucking say something.”</em><br>
            <strong style="font-size: 0.9em;">- Bron Smith, A merchant, in a snippet from a letter to his wife</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Land of Hushed Winds</h3>
            Southfield is the quiet heart of Virelia, a region of windswept plains and flat-topped mesas where the wind carries sound with treacherous clarity. To an outsider, the landscape looks ordinary - endless fields of grain, root vegetables, and grazing sheep. But the architecture tells a different story. Every home is built low to the ground with thick, padded walls. Roofs are lined with sound-baffles, and doors are heavy, woven things designed not to lock intruders out, but to keep the noise in. The culture here is defined by an oppressive, deliberate stillness. Locals speak softly, and only when necessary. Arguments are conducted in hushed tones or through written notes, and public plazas are filled with people conducting business through hand-signs and nods. It is not a vow of silence, nor is it a superstition; it is simply good manners. In Southfield, a loud voice is considered as rude as spitting on a dinner table - a sign of a lack of discipline that marks one immediately as an outsider.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Silent Miracle</h4>
            This cultural obsession with quiet is rooted in history. During the Fructure Wars, a wave of strange metaphysical stillness swept through the region. For generations, it was an observable fact: the quieter a place was, the more it flourished. Crops grew taller in silent fields; livestock thrived in hushed barns. That magic faded three generations ago. The locals know the land no longer requires silence to bloom, but the habit remains. They maintain the quiet out of a deep, stoic respect for the past, and because after centuries of whispering, the noise of the modern world simply feels wrong to them.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Governance of the Nod</h4>
            Governance in Southfield is decentralized and deeply conservative. While technically under the purview of the Greywater Compact, the region is too far, too poor, and too stubborn to be worth micromanaging. Power rests with local Village Councils, usually composed of the older and more established families.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Market of The Dead (Glaskatch)</h4>
            On the fringe of this quiet land sits Glaskatch, a city that took Southfield’s introspection and elevated it to a spiritual science. Here, silence is not just for the crops; it is for the soul. Glaskatch is the cathedral of the Personality Shard, built on the art of Soul-Transfer - a delicate necromantic ceremony where the traits, skills, and memories of the deceased are distilled into crystal fragments. The trade is driven by a desire for connection and betterment. A grieving widow might purchase a high-quality shard of her husband’s “Warmth” to keep his presence in the house, while an apprentice might save for years to buy a shard of “Mastery” from a legendary smith to guide their hands. The value of a shard is determined by the purity of the transfer; a clean extraction performed by a master medium is worth a fortune, while a clouded, low-quality fragment might offer nothing but vague, static-filled urges.<br>
            <strong>The Shadow Trade:</strong> While the public trade is therapeutic, the city has a rot at its core. The Speculars - radical philosophers obsessed with the Mirror Realm, have a stranglehold on the city's underbelly. They deal in the forbidden: low-quality “junk” shards sold to addicts, and dark rumors of shards harvested from the living - a heresy that the city guard officially denies.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>Have you ever seen the rain:</strong> An onion farmer is worried that the rainfall this fall won’t be enough. He asks the party to clear out a group of bandits who settled in the nearby lake so he can divert the water. Rudely enough, the bandits are singing drunk songs at night, and he is is convinced the noise is souring his crop.<br>
            &bull; <strong>The Counterfeit Soul:</strong> A flood of high-quality “Mastery” shards has hit the market, offering incredible sword-skills for a suspiciously low price. However, users are reporting blackouts and violent outbursts. The party is hired to trace the source, potentially uncovering a Specular lab creating artificial, unstable souls.<br>
            &bull; <strong>The Harvest of the Living:</strong> A series of comatose victims have been found in the alleys of Glaskatch. They are physically unharmed, but their minds are blank - stripped of memory and personality. The local authorities are suppressing the news, but the families are desperate. Someone is harvesting shards from the living, and they need to be stopped before they strike again.
			`
},
"Remosa": {
        "title": "Remosa",
        "type": "Region",
		"image": "assets/Remosa.jpg",
        "coords": [-68, -71],
        "content": `
<strong style="font-size: 0.9em;">
  To: Citizen Marl, District 4.<br>
  Re: Collapse of Outer Wall Section C-9 onto Residential Property.
</strong>
<br>
<em style="color: #555;">
  Regarding your complaint that a strategic masonry unit dislodged from the defensive perimeter and crushed your kitchen: Claim Denied.
  Under the Imperial Preservation Act, all defensive structures are classified as “Active Military Assets” regardless of their current structural integrity.
  Gravity is considered an act of nature, not state negligence. Furthermore, be advised that filing a second complaint will result in an audit of your household’s conscription eligibility.
  We suggest you grind the brick into mortar and repair your roof yourself.
</em>
<br>
<strong style="font-size: 0.9em;">
  – Stamped by Junior Adjudicator Sloan
</strong>
<br><br>
            <h3 style="color: #8B0000; margin-bottom: 5px;">The Hollow Shield</h3>
            They are the shield of the world, but they are a shield that is rusting through. To its own citizens, it is the proud remnant of true civilization. It is a land of monumental architecture, magically warded walls, and roads of smooth white stone that hum with self-repair enchantments. However, Remosa’s glory days are long gone. It was heavily reliant on the magic of old, and post-sundering Remosa can no longer maintain its wonders. The magical glyphs in the walls are stuttering, the self-repairing roads slowly crumble, and their cities are too large for the remaining population. The Empire is clinically bankrupt; the treasury was emptied by the Fracture Wars, and whatever resources they have left are all going toward the containment of The Mire. To the rest of Virelia, Remosa is an arrogant relic. The neighboring regions despise the Empire for the brutal wars of reconquest it waged during the Fracture, viewing their modern-day endless military drills and rigid laws as needless bravado.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Zone of the End</h4>
            Geographically, Remosa is a massive territory that wraps around a central wound. The heart of the region contains The Mire (often called “The Zone of the End”), the collapsed crater where reality gave way during the Sundering. This is not merely a dangerous territory; it is a place where the laws of existence have shattered. It is 100% uninhabitable. Inside the Mire, water might turn into liquid helium or acid without warning; gravity shifts horizontally; and time storms can age a man to dust in seconds or trap him in a single moment forever. Poisonous gases that do not exist on the periodic table fill the sky, shimmering with colors that hurt the human eye. To contain this, the Empire relies on the Green Wall. A massive ring of bio-engineered forests planted in the immediate aftermath of the Sundering. These twisted, towering trees were designed to “drink” the magic and toxic gas pouring out of the death zone, acting as a biological filter. Behind this forest lies the Iron Perimeter, a militarized infrastructure dedicated solely to looking in. The soldiers here do not watch for armies; they watch for mutated creatures and for the moment the physics of the Mire might try to leak out.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The History of Hubris</h4>
            When the gods vanished, the Remosan Empire did not simply collapse; it panicked. In a desperate bid to maintain order, the generals and archmages attempted to recreate the divine laws of physics and magic through industrial force. They opened the Bio-Forges to mass-produce soldiers (the Orrak), weaponized unexplored schools of magic, and poured their souls into constructs. They tried to be gods, and they broke the world doing it. Remosa today is the wreckage of that hubris - a nation guarding the artillery craters of a war they started and lost.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">Governance: The Boiling Point</h4>
            The governance of Remosa is a polite fiction sitting atop a powder keg. Officially, the region is ruled by the Continuity Council in the capital of Ezgarin. These bureaucrats and noble heirs cling to the pomp of the old empire, obsessed with filing triplicates, maintaining court etiquette, and issuing decrees that no one reads. They are obsessed with maintaining the image of stability. In contrast, the Mire Commanders on the wall have quietly stopped obeying laws that don't help them survive. These generals hold the Iron Perimeter. Because the threat of the Mire is constant, they have utilized emergency powers to conscript citizens, seize resources, and commandeer industry at will. They view the Council as soft, delusional parasites who waste resources on parades while the soldiers bleed. The tension is palpable. Commanders at the front often go months without supplies, their calls for aid answered only by silence or bureaucratic delays, leading to a deep, simmering hatred for the capital.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Imperial Magic</h4>
            Remosan magic is defined by maintenance and necessity. The Empire no longer innovates; it repairs. As a result, the most valued caste in Remosan society is not the battle-mage, but the Siege-Engineer. The professionals who can coax another decade of life out of a failing ward or re-align the gears of a stuttering golem.<br>
            <strong>The Walking Legacy:</strong> The region is teeming with constructs. Graith, massive stone golems and intricate clockwork servitors from the Golden Age. Since the art of creating new high-grade cores is lost, these machines are irreplaceable. A marketplace might be guarded by a silent war-automaton that has stood watch for three centuries, its joints lovingly polished and re-oiled by a dedicated team of artificers who treat it more like a grandfather than a tool.<br>
            <strong>Bureaucratic Necromancy:</strong> In the semi-autonomous city of Urik-Van, the obsession with bureacracy transcends death. The city maintains a council of undead advisors. Resurrected judges and statesmen who ensure that the interpretation of the law remains exactly as it was centuries ago. Here, death is not an end; it is simply a tenure review.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Conscription:</strong> The party enters a prosperous Remosan town just as a Mire Commander declares martial law. He demands 100 able-bodied recruits for a “suicide push” to seal a breach in the Green Wall. The local Mayor (a Council loyalist) tries to forbid it, claiming it violates a tax statute, sparking a standoff that threatens to turn into a massacre.<br>
            &bull; <strong>The Filter Failure:</strong> One of the massive ancient air-scrubbers along the Green Wall has stopped humming. The local garrison is too understaffed to fix it, and strange, iridescent fog is beginning to drift into the farmland. The party is hired to enter the intake station (which is technically inside the bio-forest) to restart the engine.<br>
            &bull; <strong>The Fire Sale:</strong> A Mire Commander is secretly selling off dangerous, high-grade magical artillery to a crime syndicate in Haldrith. He isn't doing it for greed; he needs the coin to buy winter cloaks for his unit. The party is hired to stop the sale before military-grade siege weapons fall into criminal hands, but they find the Commander is sympathetic and desperate.
			`
},
"Tavernash": {
        "title": "Tavernash",
        "type": "Region",
		"image": "assets/Tavernash.jpg",
        "coords": [-44, -153],
        "content": `
<em style="color: #555;">“I have a rock here from Haldrith. Look at it. Jagged. Sharp. Unbalanced. Hold it. Feels good, doesn't it? It’s yours for 50 silver. Just don't let your father see you holding that.”</em><br>
            <strong style="font-size: 0.9em;">- Franz Greenhaven, smuggler, talking to an absolved child</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Sacred Plane</h3>
            Tavernash is a land of unnatural, manufactured serenity. Geographically, it is a flat, expansive peninsula where the laws of aerodynamics and gravity are artificially smoothed by the Gyre-Stone. Without this massive monolith of the old age at the island's center, the region would quickly sink under the tides. In Tavernash, the wind does not blow; it quietly hums. The sea does not crash; it laps against the shore in a perfect, calm rhythm. This physical stillness has birthed a culture of deep, philosophical detachment. The land actively resists chaos and change. To shout in Tavernash is not just rude, it feels physically difficult. As if the air itself resists the discord.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Kenosis</h4>
            The culture of Tavernash is defined by the Kenosis - “The Great Emptying.” The state religion teaches that emotion is a chaotic tether that binds the soul to the suffering of the material world. To be “Holy” is to be detached - to observe the world without reacting to it. To achieve this state, the nobility and clergy partake in the Sacrament of Nareth. A tea brewed from the sap of the Ringwood trees. It is a potent narcotic that does not induce a “high,” but rather a profound, lucid impersonality. It dissolves anxiety, ambition, and rage, leaving behind a cool, functional logic. Class is defined by a tradition of inheritance, which grants the privilege of the Sacrament. The Absolved (the nobility) take the Sacrament daily, existing in a state of holy, velvet numbness. They speak slowly, move gracefully, and view panic as a vulgarity. The Tethered (the commoners) consume very little. They are mostly kelp-farmers and fishermen living on the coast, too busy feeding the nation to be “Enlightened.” They bear the burden of emotion with grim pride, viewing their rulers not as oppressors, but as holy martyrs who sacrifice their humanity to maintain the kingdom’s delicate balance.<br><br>
            
            <h4 style="color: #000080; margin-bottom: 3px;">House of Tavren</h4>
            Tavernash is a traditional monarchy ruled by the House of Tavren from the crystal-spire fortress of Aretzu. King Valerius Tavren is not a tyrant, but a custodian. His role is to maintain the Gyre-Stone and ensure the “Sacred Stillness” holds back the tides. His governance is one of benevolent neglect. He follows a strict policy of “Live and Let Live,” refusing to convert or micromanage the fishing villages of the coast. As long as the food carts arrive at the capital and the tithes are paid, the Tethered are left to their rustic lives. Order is maintained by the Silentiaries, monks armed with tuning-fork staves. They do not police crime so much as they police Discord. A public brawl, a breakdown of emotional control, or a bad reaction to the Sacrament is met with swift, magical sedation. They ensure that the kingdom remains calm, for friction is the first symptom of chaos.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Nareth Ringwood</h4>
            The single, circular forest on the map is the kingdom's holiest site. It surrounds a stable Rift known as The Silence. The trees that grow in its perimeter soak up all sound and emotion, and produce the sap that's used in the Sacrament. Pilgrims travel from all over Virelia to stand at the edge of the woods. It is said that if you whisper your worst memory into the trees, The Silence will eat it, and you will leave the woods healed, though often missing a piece of yourself.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Gyre-Wobble:</strong> During a high-society gala, the Gyre-Stone stutters. For ten seconds, the unnatural repression of the ocean fails. Seawater erupts from the drains and surges over the sea-walls, flooding the lower plaza of Aretzu with waist-deep brine before instantly receding when the Stone stabilizes. The King hires the party to journey into the mechanism beneath Aretzu to find the “discordant gear” before the capital is swallowed by the sea.<br>
            &bull; <strong>The Black Sap:</strong> A smuggler in the fishing villages is exporting a concentrated, black version of the Nareth Sacrament. It doesn't cause detachment; it causes total memory erasure. The Silentiaries need outsiders to track the source, as their own agents are too “detached” to understand the criminal mindset.<br>
            &bull; <strong>The Pilgrim's Price:</strong> A wealthy merchant from Rivhalde hires the party to escort his traumatized daughter to the Nareth Ringwood. He hopes the Rift will “eat” her grief. The party must protect her from bandits who target wealthy pilgrims, only to realize the “cure” might take her personality along with her sorrow.			`
},
"Myrskov": {
        "title": "Myrskov",
        "type": "Region",
		"image": "assets/Myrskov.jpg",
        "coords": [-81, -144],
        "content": `
           <em style="color: #555;">“You're walking too loud.” “I barely made a sound.” “It’s not about the twigs. It’s the intent. If you march through like a soldier, the woods will treat you like one.” “So how should I walk then?” “You have to walk like who you are, not like the role you were assigned. Do that, and the mist might just let you pass.”</em><br>
            <strong style="font-size: 0.9em;">- Elnira, Myrrkin Guide, instructing a mercenary</strong><br><br>

            <h3 style="color: #8B0000; margin-bottom: 5px;">The Overlapping Land</h3>
            Myrskov is a region of double-vision. To the naked eye, it is a dense, damp boreal forest, heavy with ancient pines and clinging mist. But to the mind, it is something else entirely. The air feels thick, charged with unplaced nostalgia. It is a place where a second, dreamlike reality sits heavily on top of the physical world. This is not a trap for the unwary, but a test of the spirit. A pragmatic traveler might cross Myrskov and see nothing but trees and fog. But for the sensitive or the open-hearted, the forest induces a state of child-like wonder, a feeling of returning to a home one has never visited. The danger here is not getting lost in the geography, but drifting too far into this feeling of “oneness,” forgetting the urgency of the waking world.<br>
            Despite this, while not heavily populated, the region is mostly stable. Some villages thrive, maintained by the Listeners. These local guardians patrol the “Chime Routes” - ancient paths marked by iron bells and bone wind chimes. They train to listen for the subtle discord in the wind that signals a Rift opening or the dream-layer growing too thick.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">The Collision</h4>
            Before the Sundering, Myrskov was simply a forest: deep, dark, plentiful and mundane. But when the world broke, the Glimmerwild - a dimension of pure emotion and fey logic collided with this part of Virelia. The impact was catastrophic for the Glimmerwild. While the collision made the forest of Myrskov softer and more dreamlike, the exchange went both ways: the rigid, static physics of Virelia infected the Glimmerwild like a virus. The dream-realm began to “calcify,” dying by becoming bound to our universe’s laws. The Myrrkin are the refugees of this slow apocalypse, fleeing a home that is hardening into stone and swiftly kills their population.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Governance of Whispers</h4>
            There is no secular government in Myrskov because laws require a rigid reality to enforce, and reality here is negotiable. In the absence of soldiers, power has shifted to the Druids and Shamans. These spiritual leaders are the only ones who can navigate the overlapping logics of the forest without losing their minds. They act as the de facto judges, mediators, and protectors, interpreting the mood of the forest as often as they interpret the needs of the people.<br>
            The only true city in the region is Brackwater Hold. Originally built by the Remosan Empire as a forward operating base to conquer the region, the fortress was a failure of epic proportions. The Empire quickly realized that walls cannot keep out dreams, and supply lines cannot be maintained when soldiers go missing so often. They abandoned the hold, and the locals moved in. Now, the high stone walls meant to repel the forest are covered in moss and vines, housing a community that survives by processing resin and harvesting memory-bark.<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Spiritual Spellcasting</h4>
            Magic in Myrskov is introspective and symbolic. Spells here shape themselves around emotion and metaphor rather than rigid arcane formulas. Consequently, Wizards often struggle here, finding their precise calculations slipping like wet soap. Druidic magic, however, thrives. The shamans of Myrskov do not just command nature; they bargain with the collective subconscious of the wood. Because of the thin veil, the forest is home to the largest population of Myrrkin in Virelia. They serve as natural mediators between the locals and the lingering fey influence, often hired to interpret sudden blooms of strange flora or to calm down localized “emotional storms.”<br><br>

            <h4 style="color: #000080; margin-bottom: 3px;">Plot Hooks</h4>
            &bull; <strong>The Sleepless Agent:</strong> A Weave agent went missing in the woods three weeks ago. Her body has not been found, but her “dream” has returned to her home village. Every night, a spectral version of her walks into the tavern, orders a drink, and asks for help, repeating the same coordinates before vanishing at dawn.<br>
            &bull; <strong>The Fading Town:</strong> A small hamlet near the eastern border is slowly “falling asleep.” First the birds went silent, then the livestock stopped moving. Now, the villagers are found standing in their fields, staring at the sun, their memories unraveling hour by hour.<br>
            &bull; <strong>The Echo-Child:</strong> A child in Brackwater has begun speaking a dialect of Sylvan that hasn't been heard since the moment of the Collision. The local elders fear the boy isn't just remembering a past life—he is a vessel for a Glimmerwild entity trying to push its way back through the veil.
			`
}
} ;