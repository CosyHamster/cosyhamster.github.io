"use strict";
var COSStatList = [];
var statList = [];
var selectedStats = [];
var activeFilters = [];
var nameStat;
var sortFunction;
var sortAscending = false;
var sortDirty = false;
var STAT_LIST_TABLE = document.getElementById("statList");
var CONFIGURE_STAT_TYPES_BUTTON = document.getElementById("addStatTypesButton");
var FILTER_CONTAINING_DIV = document.getElementById("filterConfigurations");
var FLOATING_WINDOW = document.getElementById("floatingWindow");
var FLOATING_WINDOW_TABLE = document.getElementById("floatingWindowTable");
var FLOATING_WINDOW_SEARCH_BAR = document.getElementById("floatingWindowSearchBar");
var FilterType;
(function (FilterType) {
    FilterType[FilterType["EQUALS"] = 0] = "EQUALS";
    FilterType[FilterType["CONTAINS"] = 1] = "CONTAINS";
    FilterType[FilterType["LESS_THAN"] = 2] = "LESS_THAN";
    FilterType[FilterType["LESS_THAN_EQUALS"] = 3] = "LESS_THAN_EQUALS";
    FilterType[FilterType["GREATER_THAN"] = 4] = "GREATER_THAN";
    FilterType[FilterType["GREATER_THAN_EQUALS"] = 5] = "GREATER_THAN_EQUALS";
})(FilterType || (FilterType = {}));
class Filter {
    constructor(statType, filterType, inputtedText, reverseFilter) {
        this.statType = statType;
        this.filterType = filterType;
        this.inputtedText = inputtedText;
        this.reverseFilter = reverseFilter;
    }
    test(creature) {
        const filterResult = this.statType.filter(creature, this.filterType, this.inputtedText);
        return (this.reverseFilter) ? !filterResult : filterResult;
    }
}
class StatValue {
    getDisplayValue(creature) {
        return String(this.getValue(creature));
    }
    constructor(displayName, keyName) {
        this.canBeDisabled = true;
        this.displayName = displayName;
        this.keyName = keyName;
    }
}
class ValuelessAbilityStat extends StatValue {
    getDisplayValue(creature) {
        return this.getValue(creature) ? "Yes" : "No";
    }
    constructor(displayName, keyName) {
        super(displayName, keyName.toLowerCase());
        this.getValue = ((creature) => {
            let indexOf = creature.passive.indexOf(this.keyName);
            if (indexOf == -1) {
                indexOf = creature.activated.indexOf(this.keyName);
                return indexOf != -1;
            }
            else {
                return true;
            }
        }).bind(this);
        this.sort = ((creature1, _) => {
            return (this.getValue(creature1) ? -1 : 1) * (sortAscending ? -1 : 1);
        }).bind(this);
        this.filter = ((creature, filterType, testVal) => {
            switch (filterType) {
                case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
                case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
                default: return false;
            }
        }).bind(this);
    }
}
class KeyedNumberStatValue extends StatValue {
    constructor(displayName, keyName) {
        super(displayName, keyName);
        this.getDisplayValue = (creature) => {
            const value = this.getValue(creature);
            if (isNaN(value))
                return "N/A";
            else
                return String(value);
        };
        this.getValue = ((creature) => {
            return parseFloat(creature[this.keyName]);
        }).bind(this);
        this.sort = ((creature1, creature2) => {
            let creature1Value = this.getValue(creature1);
            let creature2Value = this.getValue(creature2);
            if (isNaN(creature1Value))
                return Number.MAX_SAFE_INTEGER;
            if (isNaN(creature2Value))
                return Number.MIN_SAFE_INTEGER;
            return (sortAscending) ? creature1Value - creature2Value : creature2Value - creature1Value;
        }).bind(this);
        this.filter = ((creature, filterType, testVal) => {
            switch (filterType) {
                case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
                case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
                case FilterType.LESS_THAN: return this.getValue(creature) < parseFloat(testVal);
                case FilterType.LESS_THAN_EQUALS: return this.getValue(creature) <= parseFloat(testVal);
                case FilterType.GREATER_THAN: return this.getValue(creature) > parseFloat(testVal);
                case FilterType.GREATER_THAN_EQUALS: return this.getValue(creature) >= parseFloat(testVal);
                default: return false;
            }
        }).bind(this);
    }
}
class AbilityNumberStatValue extends StatValue {
    constructor(displayName, keyName) {
        super(displayName, keyName.toLowerCase());
        this.getDisplayValue = (creature) => {
            const value = this.getValue(creature);
            if (isNaN(value))
                return "N/A";
            else
                return String(value);
        };
        this.getValue = ((creature) => {
            let searchString = creature.passive;
            let indexOf = searchString.indexOf(this.keyName);
            if (indexOf == -1) {
                searchString = creature.activated;
                indexOf = searchString.indexOf(this.keyName);
            }
            if (indexOf == -1)
                return NaN;
            let abilityNameEndIndex = indexOf + this.keyName.length;
            let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex) + 1, searchString.indexOf(")", abilityNameEndIndex));
            return parseFloat(abilityValue);
        }).bind(this);
        this.sort = ((creature1, creature2) => {
            let creature1Value = this.getValue(creature1);
            let creature2Value = this.getValue(creature2);
            if (isNaN(creature1Value))
                return Number.MAX_SAFE_INTEGER;
            if (isNaN(creature2Value))
                return Number.MIN_SAFE_INTEGER;
            return (sortAscending) ? creature1Value - creature2Value : creature2Value - creature1Value;
        }).bind(this);
        this.filter = ((creature, filterType, testVal) => {
            switch (filterType) {
                case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
                case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
                case FilterType.LESS_THAN: return this.getValue(creature) < parseFloat(testVal);
                case FilterType.LESS_THAN_EQUALS: return this.getValue(creature) <= parseFloat(testVal);
                case FilterType.GREATER_THAN: return this.getValue(creature) > parseFloat(testVal);
                case FilterType.GREATER_THAN_EQUALS: return this.getValue(creature) >= parseFloat(testVal);
                default: return false;
            }
        }).bind(this);
    }
}
class KeyedStringStatValue extends StatValue {
    constructor(displayName, keyName) {
        super(displayName, keyName);
        this.getValue = ((creature) => {
            return creature[this.keyName];
        }).bind(this);
        this.sort = ((creature1, creature2) => {
            const creature1Val = this.getValue(creature1);
            const creature2Val = this.getValue(creature2);
            if (creature1Val == "N/A")
                return Number.MAX_SAFE_INTEGER;
            if (creature2Val == "N/A")
                return Number.MIN_SAFE_INTEGER;
            return creature1Val.localeCompare(creature2Val) * ((sortAscending) ? -1 : 1);
        }).bind(this);
        this.filter = ((creature, filterType, testVal) => {
            switch (filterType) {
                case FilterType.EQUALS: return this.getValue(creature).toLowerCase() == testVal.toLowerCase();
                case FilterType.CONTAINS: return this.getValue(creature).toLowerCase().includes(testVal.toLowerCase());
                default: return false;
            }
        }).bind(this);
    }
}
class AbilityStringStatValue extends StatValue {
    constructor(displayName, keyName) {
        super(displayName, keyName.toLowerCase());
        this.getValue = ((creature) => {
            let searchString = creature.passive;
            let indexOf = searchString.indexOf(this.keyName);
            if (indexOf == -1) {
                searchString = creature.activated;
                indexOf = searchString.indexOf(this.keyName);
            }
            if (indexOf == -1)
                return "N/A";
            let abilityNameEndIndex = indexOf + this.keyName.length;
            let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex) + 1, searchString.indexOf(")", abilityNameEndIndex));
            return abilityValue;
        }).bind(this);
        this.sort = ((creature1, creature2) => {
            const creature1Val = this.getValue(creature1);
            const creature2Val = this.getValue(creature2);
            if (creature1Val == "N/A")
                return Number.MAX_SAFE_INTEGER;
            if (creature2Val == "N/A")
                return Number.MIN_SAFE_INTEGER;
            return creature1Val.localeCompare(creature2Val) * ((sortAscending) ? -1 : 1);
        }).bind(this);
        this.filter = ((creature, filterType, testVal) => {
            switch (filterType) {
                case FilterType.EQUALS: return this.getValue(creature).toLowerCase() == testVal.toLowerCase();
                case FilterType.CONTAINS: return this.getValue(creature).toLowerCase().includes(testVal.toLowerCase());
                default: return false;
            }
        }).bind(this);
    }
}
function initializeStatList() {
    nameStat = new KeyedStringStatValue("Name", "common");
    nameStat.canBeDisabled = false;
    statList.push(nameStat);
    statList.push(new KeyedStringStatValue("Class", "class"));
    statList.push(new KeyedStringStatValue("Type", "type"));
    statList.push(new KeyedStringStatValue("Diet", "diet"));
    statList.push(new KeyedNumberStatValue("Tier", "tier"));
    statList.push(new KeyedNumberStatValue("Ambush", "ambush"));
    statList.push(new KeyedNumberStatValue("Appetite", "appetite"));
    statList.push(new KeyedNumberStatValue("Beached Speed", "beachSpeed"));
    statList.push(new KeyedNumberStatValue("Bite Cooldown", "biteCooldown"));
    statList.push(new KeyedStringStatValue("Blood Color", "bloodColor"));
    statList.push(new KeyedStringStatValue("Blood Texture", "bloodTexture"));
    statList.push(new KeyedStringStatValue("Breath Type", "breath"));
    statList.push(new KeyedStringStatValue("Concept Artist(s)", "conceptBy"));
    statList.push(new KeyedNumberStatValue("Bite Damage", "damage"));
    statList.push(new KeyedNumberStatValue("Secondary Damage", "damage2"));
    statList.push(new KeyedNumberStatValue("Dart Power", "dartPower"));
    statList.push(new KeyedNumberStatValue("Dart Stamina Cost", "dartStamina"));
    statList.push(new KeyedStringStatValue("Creation Date", "dateAdded"));
    statList.push(new KeyedNumberStatValue("Fly Multiplier", "flyMultiplier"));
    statList.push(new KeyedNumberStatValue("Fly Speed", "flySpeed"));
    statList.push(new KeyedNumberStatValue("Fly Sprint Multiplier", "flySprintMultiplier"));
    statList.push(new KeyedNumberStatValue("Glide Stamina Regen", "glideStaminaRegen"));
    statList.push(new KeyedNumberStatValue("Growth Time (minutes)", "growthTime"));
    statList.push(new KeyedNumberStatValue("Health", "health"));
    statList.push(new KeyedNumberStatValue("Health Regen Percent", "healthRegen"));
    statList.push(new KeyedNumberStatValue("Hunger Drain", "hungerDrain"));
    statList.push(new KeyedNumberStatValue("Thirst Drain", "thirstDrain"));
    statList.push(new KeyedStringStatValue("Image Link", "imageLink")); //I'll probably do something with this at some point lol
    statList.push(new KeyedNumberStatValue("Minimum Age to use Spacebar", "jumpAge"));
    statList.push(new KeyedNumberStatValue("Jump Power", "jumpPower"));
    statList.push(new KeyedNumberStatValue("Jump Stamina Cost", "jumpStamina"));
    statList.push(new KeyedNumberStatValue("Moisture Duration (seconds)", "moistureTime"));
    statList.push(new KeyedNumberStatValue("Night Vision", "nightVision"));
    statList.push(new KeyedNumberStatValue("Oxygen Duration (seconds)", "oxygenTime"));
    statList.push(new KeyedNumberStatValue("Sprint Speed", "sprintSpeed"));
    statList.push(new KeyedNumberStatValue("Walk and Swim Speed", "walkAndSwimSpeed"));
    statList.push(new KeyedNumberStatValue("Stamina Regen", "staminaRegen"));
    statList.push(new KeyedNumberStatValue("Max Stamina", "stamina"));
    statList.push(new KeyedNumberStatValue("Stored Price", "storedPrice"));
    statList.push(new KeyedNumberStatValue("Take off Multiplier", "takeoffMultiplier"));
    statList.push(new KeyedNumberStatValue("Turn Radius", "turn"));
    statList.push(new KeyedNumberStatValue("Weight (lbs)", "weight"));
    statList.push(new ValuelessAbilityStat("Grab", "Grab"));
    statList.push(new AbilityNumberStatValue("Latch", "Latch"));
    statList.push(new ValuelessAbilityStat("Guilt", "Guilt"));
    statList.push(new ValuelessAbilityStat("Harden", "Harden"));
    statList.push(new ValuelessAbilityStat("Frosty", "Frosty"));
    statList.push(new ValuelessAbilityStat("Climber", "Climber"));
    statList.push(new ValuelessAbilityStat("Fortify", "Fortify"));
    statList.push(new ValuelessAbilityStat("Berserk", "Berserk"));
    statList.push(new ValuelessAbilityStat("Volcanic", "Volcanic"));
    statList.push(new ValuelessAbilityStat("Earthquake", "Earthquake"));
    statList.push(new ValuelessAbilityStat("Drowsy Area", "Drowsy Area"));
    statList.push(new ValuelessAbilityStat("Egg Stealer", "Egg Stealer"));
    statList.push(new ValuelessAbilityStat("Sticky Fur", "Sticky Fur"));
    statList.push(new ValuelessAbilityStat("Adrenaline", "Adrenaline"));
    statList.push(new ValuelessAbilityStat("Tail Drop", "Tail Drop"));
    statList.push(new ValuelessAbilityStat("Agile Swimmer", "Agile Swimmer"));
    statList.push(new ValuelessAbilityStat("Water Gale", "Water Gale"));
    statList.push(new ValuelessAbilityStat("Life Leech", "Life Leech"));
    statList.push(new ValuelessAbilityStat("Warden's Rage", "Warden's Rage"));
    statList.push(new ValuelessAbilityStat("Will To Live", "Will To Live"));
    statList.push(new ValuelessAbilityStat("Quick Recovery", "Quick Recovery"));
    statList.push(new ValuelessAbilityStat("Reflect", "Reflect"));
    statList.push(new ValuelessAbilityStat("Snow Shield", "Snow Shield"));
    statList.push(new ValuelessAbilityStat("Unbreakable", "Unbreakable"));
    statList.push(new ValuelessAbilityStat("Serrated Teeth", "Serrated Teeth"));
    statList.push(new ValuelessAbilityStat("Iron Stomach", "Iron Stomach"));
    statList.push(new ValuelessAbilityStat("Keen Observer", "Keen Observer"));
    statList.push(new ValuelessAbilityStat("Healing Pulse", "Healing Pulse"));
    statList.push(new ValuelessAbilityStat("Pack Healer", "Pack Healer"));
    statList.push(new ValuelessAbilityStat("Mud Pile", "Mud Pile"));
    statList.push(new ValuelessAbilityStat("Strength In Numbers", "Strength In Numbers"));
    statList.push(new ValuelessAbilityStat("Hunters Curse", "Hunter's Curse"));
    statList.push(new ValuelessAbilityStat("Unbridled Rage", "Unbridled Rage"));
    statList.push(new ValuelessAbilityStat("Cause Fear", "Cause Fear"));
    statList.push(new ValuelessAbilityStat("Dazzling Flash", "Dazzling Flash"));
    statList.push(new ValuelessAbilityStat("Shock Area", "Shock Area"));
    statList.push(new ValuelessAbilityStat("Invisibility", "Invisibility"));
    statList.push(new ValuelessAbilityStat("Stamina Puddle", "Stamina Puddle"));
    statList.push(new ValuelessAbilityStat("Poison Area", "Poison Area"));
    statList.push(new ValuelessAbilityStat("Channeling", "Channeling"));
    statList.push(new ValuelessAbilityStat("Toxic Trap", "Toxic Trap"));
    statList.push(new ValuelessAbilityStat("Thorn Trap", "Thorn Trap"));
    statList.push(new ValuelessAbilityStat("Sticky Trap", "Sticky Trap"));
    statList.push(new ValuelessAbilityStat("Speed Steal", "Speed Steal"));
    statList.push(new ValuelessAbilityStat("Speed Blitz", "Speed Blitz"));
    statList.push(new ValuelessAbilityStat("Escape Area", "Escape Area"));
    statList.push(new ValuelessAbilityStat("Raider", "Raider"));
    statList.push(new ValuelessAbilityStat("Change Weather", "Change Weather"));
    statList.push(new ValuelessAbilityStat("Area Food Restore", "Area Food Restore"));
    statList.push(new ValuelessAbilityStat("Area Water Restore", "Area Water Restore"));
    statList.push(new AbilityNumberStatValue("Diver", "Diver"));
    statList.push(new AbilityNumberStatValue("Hunker", "Hunker"));
    statList.push(new AbilityNumberStatValue("Burrower", "Burrower"));
    statList.push(new AbilityNumberStatValue("Radiation", "Radiation"));
    statList.push(new AbilityNumberStatValue("Healing Hunter", "Healing Hunter"));
    statList.push(new AbilityNumberStatValue("Heal Aura", "Heal Aura"));
    statList.push(new AbilityNumberStatValue("Cursed Sigil", "Cursed Sigil"));
    statList.push(new AbilityNumberStatValue("First Strike", "First Strike"));
    //aliment attack
    statList.push(new AbilityNumberStatValue("Bleed Attack", "Bleed Attack"));
    statList.push(new AbilityNumberStatValue("Poison Attack", "Poison Attack"));
    statList.push(new AbilityNumberStatValue("Necropoison Attack", "Necropoison Attack"));
    statList.push(new AbilityNumberStatValue("Burn Attack", "Burn Attack"));
    statList.push(new AbilityNumberStatValue("Disease Attack", "Disease Attack"));
    statList.push(new AbilityNumberStatValue("Frostbite Attack", "Frostbite Attack"));
    statList.push(new AbilityNumberStatValue("Corrosion Attack", "Corrosion Attack"));
    statList.push(new AbilityNumberStatValue("Injury Attack", "Injury Attack"));
    statList.push(new AbilityNumberStatValue("Wing Shredder", "Wing Shredder"));
    //block aliment
    statList.push(new AbilityNumberStatValue("Block Bleed", "Block Bleed"));
    statList.push(new AbilityNumberStatValue("Block Poison", "Block Poison"));
    statList.push(new AbilityNumberStatValue("Block Necropoison", "Block Necropoison"));
    statList.push(new AbilityNumberStatValue("Block Burn", "Block Burn"));
    statList.push(new AbilityNumberStatValue("Block Disease", "Block Disease"));
    statList.push(new AbilityNumberStatValue("Block Frostbite", "Block Frostbite"));
    statList.push(new AbilityNumberStatValue("Block Corrosion", "Block Corrosion"));
    statList.push(new AbilityNumberStatValue("Block Injury", "Block Injury"));
    statList.push(new AbilityNumberStatValue("Breath Resistance", "Breath Resistance"));
    //defensive aliment
    statList.push(new AbilityNumberStatValue("Defensive Bleed", "Defensive Bleed"));
    statList.push(new AbilityNumberStatValue("Defensive Poison", "Defensive Poison"));
    statList.push(new AbilityNumberStatValue("Toxic Trail", "Toxic Trail"));
    statList.push(new AbilityNumberStatValue("Defensive Necropoison", "Defensive Necropoison"));
    statList.push(new AbilityNumberStatValue("Defensive Burn", "Defensive Burn"));
    statList.push(new AbilityNumberStatValue("Defensive Paralyze", "Defensive Paralyze"));
    statList.push(new AbilityNumberStatValue("Defensive Disease", "Defensive Disease"));
    statList.push(new AbilityNumberStatValue("Defensive Frostbite", "Defensive Frostbite"));
    statList.push(new AbilityNumberStatValue("Defensive Corrosion", "Defensive Corrosion"));
    statList.push(new AbilityNumberStatValue("Defensive Injury", "Defensive Injury"));
    statList.push(new AbilityNumberStatValue("Defensive Wing Shredder", "Defensive Wing Shredder"));
    statList.push(new AbilityStringStatValue("Charge", "Charge"));
    statList.push(new AbilityStringStatValue("Totem", "Totem"));
}
function initializeCreatureStats() {
    return new Promise((resolve) => {
        function onError(reason) {
            setTimeout(tryLoad, 3000);
            console.error(reason);
            console.log("Retrying in 3000ms");
        }
        function tryLoad() {
            fetch("creatureStats.json", { priority: "high" }).then(response => {
                if (!response.ok)
                    throw new Error("Response is not ok");
                response.json().then((uninitializedCreatureStats) => {
                    const creatureStats = [];
                    for (const [_, value] of Object.entries(uninitializedCreatureStats)) {
                        initializeCreatureObject(value);
                        creatureStats.push(value);
                    }
                    COSStatList = creatureStats;
                    resolve();
                }).catch(onError);
            }).catch(onError);
        }
        tryLoad();
    });
}
function initializeCreatureObject(creature) {
    creature.passive = creature.passive.toLowerCase();
    creature.activated = creature.activated.toLowerCase();
    creature.tableRow = document.createElement("tr");
    creature.tableRow.setAttribute("class", "hoverable creatureTableRow");
    creature.tableRow.title = creature.common;
}
function addStatValueToCreatureRows(statValue) {
    for (let i = 0; i < COSStatList.length; i++) {
        const newCell = document.createElement("td");
        newCell.setAttribute("tabindex", "-1");
        newCell.setAttribute("class", "creatureStatCell focusable");
        newCell.textContent = statValue.getDisplayValue(COSStatList[i]);
        COSStatList[i].tableRow.appendChild(newCell);
    }
}
// function removeStatValueFromCreatureRows(keyName: string){
//     for(let i = 0; i < COSStatList.length; i++){
//         const childCells = COSStatList[i].tableRow.children;
//         for(let i = 0; i < childCells.length; i++){
//             if(childCells[i].getAttribute("data-keyname") == keyName){
//                 childCells[i].remove();
//                 break;
//             }
//         }
//     }
// }
function removeStatValueFromCreatureRows(index) {
    for (let i = 0; i < COSStatList.length; i++) {
        COSStatList[i].tableRow.children[index].remove();
    }
}
function getSelectedStatValueWithKeyName(keyName) {
    for (let i = 0; i < selectedStats.length; i++) {
        if (selectedStats[i].keyName == keyName)
            return selectedStats[i];
    }
    return null;
}
function getStatValueWithKeyName(keyName) {
    for (let i = 0; i < statList.length; i++) {
        if (statList[i].keyName == keyName)
            return statList[i];
    }
    return null;
}
async function updateCreatureStatsTable() {
    if (COSStatList.length == 0)
        return; //it's not initialized yet!
    console.time("updateTable");
    let removedTableBody = false;
    const statTableBody = STAT_LIST_TABLE.querySelector("tbody");
    function ensureTableBodyRemoved() {
        if (!removedTableBody) {
            statTableBody.remove();
            removedTableBody = true;
        }
    }
    filterCreatures();
    let tableHeaderRow = STAT_LIST_TABLE.querySelector("thead").querySelector("tr");
    const headerCells = tableHeaderRow.children;
    const headerCellsKeyNames = [];
    for (let i = 0; i < headerCells.length; i++) {
        const cell = headerCells[i];
        const keyName = cell.getAttribute("data-keyname");
        if (getSelectedStatValueWithKeyName(keyName) != null) {
            headerCellsKeyNames.push(keyName);
        }
        else {
            ensureTableBodyRemoved();
            cell.remove();
            removeStatValueFromCreatureRows(i);
            --i;
        }
    }
    for (let i = 0; i < selectedStats.length; i++) {
        const statValue = selectedStats[i];
        if (!headerCellsKeyNames.includes(statValue.keyName)) {
            ensureTableBodyRemoved();
            let newCell = document.createElement("th");
            newCell.setAttribute("tabindex", "0");
            newCell.setAttribute("scope", "col");
            newCell.setAttribute("data-keyname", statValue.keyName);
            newCell.setAttribute("class", "creatureStatHeaderCell creatureStatCell");
            newCell.textContent = statValue.displayName;
            tableHeaderRow.appendChild(newCell);
            addStatValueToCreatureRows(statValue);
        }
    }
    if (sortDirty) {
        // ensureTableBodyRemoved();  //THIS USES MORE PERFORMANCE
        const wasAscending = sortAscending;
        sortAscending = false;
        COSStatList.sort(nameStat.sort);
        sortAscending = wasAscending;
        COSStatList.sort(sortFunction);
        const rowsToAppend = [];
        for (const creature of COSStatList)
            rowsToAppend.push(creature.tableRow);
        statTableBody.replaceChildren(...rowsToAppend);
        // statTableBody.replaceChildren();
        // // STAT_LIST_TABLE.style.width = (selectedStats.length*25) + "ch"
        // for(let i = 0; i < rowsToAppend.length; i++){
        //     statTableBody.append(rowsToAppend[i])
        //     await sleep(25);
        // }
        sortDirty = false;
    }
    if (removedTableBody)
        STAT_LIST_TABLE.appendChild(statTableBody);
    console.timeEnd("updateTable");
}
function applyFilters() {
    activeFilters = [];
    for (const div of FILTER_CONTAINING_DIV.children) {
        if (!(div instanceof HTMLDivElement) || div.id == "floatingWindow")
            continue;
        if (!div.querySelector("label[data-labelType='active']").querySelector("input[type='checkbox']").checked)
            continue;
        const statTypeIndex = Number(div.querySelector("button[name='statTypeSelect']").value);
        if (isNaN(statTypeIndex) || statTypeIndex == -1)
            continue;
        const filterType = getFilterTypeFromValue(div.querySelector("select").value);
        if (filterType == null)
            continue;
        const inputtedText = div.querySelector("input[type='text']").value;
        const reverseFilter = div.querySelector("label[data-labelType='reverse']").querySelector("input[type='checkbox']").checked;
        activeFilters.push(new Filter(statList[statTypeIndex], filterType, inputtedText, reverseFilter));
    }
    updateCreatureStatsTable();
}
function filterCreatures() {
    for (const creature of COSStatList) {
        let matchesAllFilters = true;
        for (const filter of activeFilters) {
            if (!filter.test(creature)) {
                matchesAllFilters = false;
                break;
            }
        }
        if (matchesAllFilters) {
            if (creature.tableRow.style.display != "table-row")
                creature.tableRow.style.display = "table-row";
        }
        else {
            if (creature.tableRow.style.display != "none")
                creature.tableRow.style.display = "none";
        }
    }
}
function getFilterTypeFromValue(value) {
    switch (value) {
        case "equals": return FilterType.EQUALS;
        case "contains": return FilterType.CONTAINS;
        case "lessThan": return FilterType.LESS_THAN;
        case "lessThanEquals": return FilterType.LESS_THAN_EQUALS;
        case "greaterThan": return FilterType.GREATER_THAN;
        case "greaterThanEquals": return FilterType.GREATER_THAN_EQUALS;
        default: return null;
    }
}
function createFilter() {
    const div = document.createElement("div");
    const button = document.createElement("button"); //div.querySelector("button[name='statTypeSelect']")
    button.name = "statTypeSelect";
    button.value = "-1";
    button.style.width = "28ch";
    button.textContent = "SELECT STAT TYPE";
    button.title = "Select a stat to filter!";
    button.addEventListener("click", () => {
        openChooseTypeMenu(button);
    });
    const deleteFilterButton = document.createElement("button");
    deleteFilterButton.name = "deleteFilter";
    deleteFilterButton.textContent = "Delete";
    deleteFilterButton.addEventListener("click", () => {
        deleteFilterButton.closest("div").remove();
    });
    const select = document.createElement("select");
    select.name = "equalityType";
    select.title = "Choose what this stat should be!";
    select.append(createOption("equals", "EQUALS"), createOption("contains", "CONTAINS"), createOption("lessThan", "<"), createOption("lessThanEquals", "≤"), createOption("greaterThan", ">"), createOption("greaterThanEquals", "≥"));
    const textInput = document.createElement("input");
    textInput.type = "text";
    textInput.style.width = "20ch";
    const reverseLabel = document.createElement("label");
    reverseLabel.setAttribute("data-labelType", "reverse");
    reverseLabel.title = "Show the creatures that don't match this filter!";
    reverseLabel.style.marginRight = "5px";
    const reverseCheckbox = document.createElement("input");
    reverseCheckbox.type = "checkbox";
    reverseCheckbox.name = "reverseCheckbox";
    const activeLabel = document.createElement("label");
    activeLabel.setAttribute("data-labelType", "active");
    activeLabel.title = "Enable / Disable this filter!";
    activeLabel.style.marginRight = "5px";
    const activeCheckbox = document.createElement("input");
    activeCheckbox.type = "checkbox";
    activeCheckbox.name = "activeCheckbox";
    activeCheckbox.checked = true;
    reverseLabel.append(reverseCheckbox, "Reverse");
    activeLabel.append(activeCheckbox, "Active");
    div.append(button, select, textInput, reverseLabel, activeLabel, deleteFilterButton);
    return div;
}
function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
function onHeaderCellClick(headerCell) {
    const prevSortFunction = sortFunction;
    sortFunction = selectedStats[headerCell.cellIndex].sort;
    if (prevSortFunction == sortFunction) {
        sortAscending = !sortAscending;
    }
    else {
        sortAscending = false;
    }
    sortDirty = true;
    updateCreatureStatsTable();
}
function openChooseTypeMenu(button) {
    button.parentElement.after(FLOATING_WINDOW);
    FLOATING_WINDOW_SEARCH_BAR.oninput = chooseTypeSearchBarUpdate;
    const rows = [];
    for (let i = 0; i < statList.length; i++) {
        const statValue = statList[i];
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.textContent = statValue.displayName;
        cell.setAttribute("class", "clickableButton");
        row.setAttribute("tabindex", "0");
        function onSelectStat() {
            closeFloatingWindow();
            button.value = String(i);
            button.textContent = statValue.displayName;
        }
        row.addEventListener("click", onSelectStat);
        row.addEventListener("keydown", (keyEvent) => {
            if (keyEvent.key == "Enter")
                onSelectStat();
        });
        row.appendChild(cell);
        rows.push(row);
    }
    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren(...rows);
    FLOATING_WINDOW.style.display = "block";
}
function chooseTypeSearchBarUpdate() {
    const searchTerm = FLOATING_WINDOW_SEARCH_BAR.value.toLowerCase();
    const tableRows = FLOATING_WINDOW_TABLE.querySelector("tbody").children;
    for (let i = 0; i < tableRows.length; i++) {
        const tableRow = tableRows[i];
        const textContent = tableRow.querySelector("td").textContent.toLowerCase();
        if (textContent.includes(searchTerm)) {
            tableRow.style.display = "table-row";
        }
        else {
            tableRow.style.display = "none";
        }
    }
}
function createOption(value, text) {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
}
function openConfigureTypesMenu() {
    CONFIGURE_STAT_TYPES_BUTTON.after(FLOATING_WINDOW);
    FLOATING_WINDOW_SEARCH_BAR.oninput = configureTypesSearchBarUpdate;
    const rows = [];
    const selectAllRow = document.createElement("tr");
    const cell = document.createElement("td");
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = selectedStats.length == statList.length;
    selectAllCheckbox.addEventListener("change", () => {
        if (selectAllCheckbox.checked) {
            for (const stat of statList) {
                if (!selectedStats.includes(stat))
                    selectedStats.push(stat);
            }
        }
        else {
            selectedStats = [];
        }
        for (const row of FLOATING_WINDOW_TABLE.querySelector("tbody").children) {
            row.querySelector("input").checked = selectAllCheckbox.checked;
        }
        updateCreatureStatsTable();
    });
    const label = document.createElement("label");
    label.setAttribute("style", "display: block; width: 100%;");
    label.append(selectAllCheckbox, "Select All");
    cell.appendChild(label);
    selectAllRow.appendChild(cell);
    rows.push(selectAllRow);
    for (let i = 0; i < statList.length; i++) {
        const statValue = statList[i];
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        // checkbox.disabled = !statValue.canBeDisabled;
        checkbox.checked = getSelectedStatValueWithKeyName(statValue.keyName) != null;
        checkbox.addEventListener("change", () => {
            const indexOfStatValue = selectedStats.indexOf(statValue);
            if (indexOfStatValue != -1) {
                selectedStats.splice(indexOfStatValue, 1);
            }
            else {
                selectedStats.push(statValue);
            }
            updateCreatureStatsTable();
        });
        const label = document.createElement("label");
        label.setAttribute("style", "display: block; width: 100%;");
        label.append(checkbox, statValue.displayName);
        cell.appendChild(label);
        row.appendChild(cell);
        rows.push(row);
    }
    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren(...rows);
    FLOATING_WINDOW.style.display = "block";
}
function configureTypesSearchBarUpdate() {
    const searchTerm = FLOATING_WINDOW_SEARCH_BAR.value.toLowerCase();
    const tableRows = FLOATING_WINDOW_TABLE.querySelector("tbody").children;
    for (let i = 0; i < tableRows.length; i++) {
        const tableRow = tableRows[i];
        const textContent = tableRow.querySelector("td").querySelector("label").textContent.toLowerCase();
        if (textContent.includes(searchTerm)) {
            tableRow.style.display = "table-row";
        }
        else {
            tableRow.style.display = "none";
        }
    }
}
function closeFloatingWindow() {
    FLOATING_WINDOW.style.display = "none";
    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren();
    FLOATING_WINDOW_SEARCH_BAR.oninput = null;
    FLOATING_WINDOW_SEARCH_BAR.value = "";
}
function onFrame(_) {
    FLOATING_WINDOW.querySelector("img").style.top = `${FLOATING_WINDOW.scrollTop}px`;
    requestAnimationFrame(onFrame);
}
(async () => {
    initializeCreatureStats().then(() => {
        updateCreatureStatsTable();
    });
    initializeStatList();
    selectedStats.push(nameStat);
    selectedStats.push(getStatValueWithKeyName("type"));
    selectedStats.push(getStatValueWithKeyName("diet"));
    selectedStats.push(getStatValueWithKeyName("tier"));
    sortFunction = nameStat.sort;
    sortAscending = false;
    sortDirty = true;
    const exitFloatingWindowButton = FLOATING_WINDOW.querySelector("img");
    exitFloatingWindowButton.addEventListener("click", closeFloatingWindow);
    exitFloatingWindowButton.addEventListener("keydown", (keyEvent) => { if (keyEvent.key == "Enter")
        closeFloatingWindow(); });
    CONFIGURE_STAT_TYPES_BUTTON.addEventListener("click", openConfigureTypesMenu);
    document.getElementById("applyFilters").addEventListener("click", () => {
        applyFilters();
    });
    document.getElementById("createFilter").addEventListener("click", () => {
        FILTER_CONTAINING_DIV.appendChild(createFilter());
    });
    FILTER_CONTAINING_DIV.appendChild(createFilter());
    requestAnimationFrame(onFrame);
})();
window.addEventListener("keydown", (keyEvent) => {
    if (keyEvent.key == "Escape") {
        closeFloatingWindow();
    }
}, true);
STAT_LIST_TABLE.addEventListener("click", (mouseEvent) => {
    const target = mouseEvent.target;
    let headerCell;
    if (target instanceof HTMLElement && (headerCell = target.closest('th')) != null) {
        onHeaderCellClick(headerCell);
    }
});
STAT_LIST_TABLE.addEventListener("keydown", (keyEvent) => {
    if (!(keyEvent.target instanceof HTMLElement))
        return;
    const STAT_TABLE_BODY = STAT_LIST_TABLE.querySelector("tbody");
    if (keyEvent.target.closest("thead") != null) {
        const target = keyEvent.target;
        let headerCell;
        if (target instanceof HTMLElement && (headerCell = target.closest('th')) != null) {
            onHeaderCellClick(headerCell);
        }
    }
    else if (keyEvent.target == STAT_LIST_TABLE) {
        switch (keyEvent.key) {
            case "Enter":
            case "ArrowRight":
            case "ArrowDown":
            case "ArrowLeft":
                keyEvent.preventDefault();
                STAT_TABLE_BODY.firstElementChild.firstElementChild.focus({ focusVisible: true });
        }
    }
    else if (keyEvent.target instanceof HTMLTableCellElement) {
        function nextSiblingTillVisibleIsFound(element) {
            while (true) {
                element = element.nextElementSibling;
                if (element) {
                    if (element.style.display == "none")
                        continue;
                    else
                        return element;
                }
                else {
                    return null; //theres no more elements!
                }
            }
        }
        function prevSiblingTillVisibleIsFound(element) {
            while (true) {
                element = element.previousElementSibling;
                if (element) {
                    if (element.style.display == "none")
                        continue;
                    else
                        return element;
                }
                else {
                    return null; //theres no more elements!
                }
            }
        }
        function goToNeighboringCell(forward) {
            keyEvent.preventDefault();
            const nextCell = ((forward) ? keyEvent.target.nextElementSibling : keyEvent.target.previousElementSibling);
            if (nextCell)
                nextCell.focus({ focusVisible: true });
        }
        function goToNeighboringRow(forward) {
            keyEvent.preventDefault();
            const parentRow = keyEvent.target.parentElement;
            const nextRow = ((forward) ? nextSiblingTillVisibleIsFound(keyEvent.target.parentElement) : prevSiblingTillVisibleIsFound(keyEvent.target.parentElement));
            const currentChildIndex = Array.prototype.indexOf.call(parentRow.children, keyEvent.target);
            if (nextRow != null) {
                const cell = nextRow.children[currentChildIndex];
                if (cell != null) {
                    cell.focus({ focusVisible: true });
                }
            }
        }
        if (keyEvent.key == "ArrowRight") {
            goToNeighboringCell(true);
        }
        else if (keyEvent.key == "ArrowLeft") {
            goToNeighboringCell(false);
        }
        else if (keyEvent.key == "ArrowDown") {
            goToNeighboringRow(true);
        }
        else if (keyEvent.key == "ArrowUp") {
            goToNeighboringRow(false);
        }
        else if (keyEvent.key == "Enter") {
            const selection = window.getSelection();
            const range = document.createRange();
            range.selectNode(keyEvent.target);
            selection.removeAllRanges();
            selection.addRange(range);
            navigator.clipboard.writeText(keyEvent.target.textContent);
        }
    }
});
//# sourceMappingURL=cosStatList.js.map