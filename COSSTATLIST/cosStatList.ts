var COSStatList: Creature[] = [];
var statList: StatValue[] = [];
var selectedStats: StatValue[] = [];
var activeFilters: Filter[] = [];
var nameStat: StatValue;
var sortFunction: (creature1: Creature, creature2: Creature) => number;
var sortAscending = false;
var sortDirty = false;

var STAT_LIST_TABLE = document.getElementById("statList") as HTMLTableElement;
var CONFIGURE_STAT_TYPES_BUTTON = document.getElementById("addStatTypesButton") as HTMLButtonElement;
var FILTER_CONTAINING_DIV = document.getElementById("filterConfigurations") as HTMLDivElement;
var FLOATING_WINDOW = document.getElementById("floatingWindow") as HTMLDivElement;
var FLOATING_WINDOW_TABLE = document.getElementById("floatingWindowTable") as HTMLTableElement;
var FLOATING_WINDOW_SEARCH_BAR = document.getElementById("floatingWindowSearchBar") as HTMLInputElement;

type Creature = {[key: string]: unknown, abilities: {[key: string]: unknown}} & {
    abilities: {
    },
    common: string
    activated: string
    passive: string
    ambush: string
    tableRow: HTMLTableRowElement
}

enum FilterType{
    CONTAINS,
    EQUALS,
    LESS_THAN,
    LESS_THAN_EQUALS,
    GREATER_THAN,
    GREATER_THAN_EQUALS
}

class Filter{
    statType: StatValue;
    filterType: FilterType;
    inputtedText: string;
    reverseFilter: boolean;
    constructor(statType: StatValue, filterType: FilterType, inputtedText: string, reverseFilter: boolean){
        this.statType = statType;
        this.filterType = filterType;
        this.inputtedText = inputtedText;
        this.reverseFilter = reverseFilter;
    }
    test(creature: Creature): boolean{
        const filterResult = this.statType.filter(creature, this.filterType, this.inputtedText);
        return (this.reverseFilter) ? !filterResult : filterResult;
    }
}

abstract class StatValue{
    displayName: string;
    keyName: string;
    getDisplayValue(creature: Creature): string{
        return String(this.getValue(creature));
    };
    abstract getValue(creature: Creature): unknown;
    // abstract initializeCreatureObject(creatureObject: Creature): void
    abstract sort(creature1: Creature, creature2: Creature): number;
    abstract filter(creature: Creature, filterType: FilterType, testVal: string): boolean;
    constructor(displayName: string, keyName: string){
        this.displayName = displayName;
        this.keyName = keyName;
    }
}

class ValuelessAbilityStat extends StatValue{
    override getDisplayValue(creature: Creature): string {
        return this.getValue(creature) ? "Yes" : "No";
    }
    override getValue = ((creature: Creature): boolean => {
        let indexOf = creature.passive.indexOf(this.keyName);
        if(indexOf == -1) {
            indexOf = creature.activated.indexOf(this.keyName);
            return indexOf != -1;
        } else {
            return true;
        }
    }).bind(this)
    // override initializeCreatureObject(creature: Creature){ /* let value = parseFloat(creature[this.keyName] as string); if(isNaN(value)) return; else creature.abilities[this.keyName] = value; */ }
    override sort = ((creature1: Creature, creature2: Creature): number => {
        return (this.getValue(creature1) ? -1 : 1) * (sortAscending ? -1 : 1);
    }).bind(this);
    override filter = ((creature: Creature, filterType: FilterType, testVal: string): boolean => {
        switch(filterType){
            case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
            default: return false;
        }
    }).bind(this);
    constructor(displayName: string, keyName: string){
        super(displayName, keyName.toLowerCase());
    }
}

class KeyedNumberStatValue extends StatValue{
    override getDisplayValue = (creature: Creature): string => {
        const value = this.getValue(creature);
        if(isNaN(value)) return "N/A";
        else return String(value);
    }
    override getValue = ((creature: Creature): number => {
        return parseFloat(creature[this.keyName] as string);
    }).bind(this);
    // override initializeCreatureObject(creature: Creature){ /* let value = parseFloat(creature[this.keyName] as string); if(isNaN(value)) return; else creature.abilities[this.keyName] = value; */ }
    override sort = ((creature1: Creature, creature2: Creature): number => {
        let creature1Value = this.getValue(creature1);
        let creature2Value = this.getValue(creature2);
        if (isNaN(creature1Value)) return Number.MAX_SAFE_INTEGER;
        if (isNaN(creature2Value)) return Number.MIN_SAFE_INTEGER;
        return (sortAscending) ? creature1Value - creature2Value : creature2Value - creature1Value;
    }).bind(this);
    override filter = ((creature: Creature, filterType: FilterType, testVal: string): boolean => {
        switch(filterType){
            case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
            case FilterType.LESS_THAN: return this.getValue(creature) < parseFloat(testVal);
            case FilterType.LESS_THAN_EQUALS: return this.getValue(creature) <= parseFloat(testVal);
            case FilterType.GREATER_THAN: return this.getValue(creature) > parseFloat(testVal);
            case FilterType.GREATER_THAN_EQUALS: return this.getValue(creature) >= parseFloat(testVal);
            default: return false;
        }
    }).bind(this);
    constructor(displayName: string, keyName: string){
        super(displayName, keyName);
    }
}

class AbilityNumberStatValue extends StatValue{
    override getDisplayValue = (creature: Creature): string => {
        const value = this.getValue(creature);
        if(isNaN(value)) return "N/A";
        else return String(value);
    }
    override getValue = ((creature: Creature): number => {
        let searchString = creature.passive;
        let indexOf = searchString.indexOf(this.keyName);
        if(indexOf == -1) {
            searchString = creature.activated;
            indexOf = searchString.indexOf(this.keyName);
        }
        if(indexOf == -1) return NaN;
        let abilityNameEndIndex = indexOf+this.keyName.length;
        let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex)+1, searchString.indexOf(")", abilityNameEndIndex))
        return parseFloat(abilityValue);
    }).bind(this);
    // override initializeCreatureObject(creature: Creature){ /* let value = parseFloat(creature[this.keyName] as string); if(isNaN(value)) return; else creature.abilities[this.keyName] = value; */ }
    override sort = ((creature1: Creature, creature2: Creature): number => {
        let creature1Value = this.getValue(creature1);
        let creature2Value = this.getValue(creature2);
        if (isNaN(creature1Value)) return Number.MAX_SAFE_INTEGER;
        if (isNaN(creature2Value)) return Number.MIN_SAFE_INTEGER;
        return (sortAscending) ? creature1Value - creature2Value : creature2Value - creature1Value;
    }).bind(this);
    override filter = ((creature: Creature, filterType: FilterType, testVal: string): boolean => {
        switch(filterType){
            case FilterType.EQUALS: return this.getDisplayValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getDisplayValue(creature).toLowerCase().includes(testVal.toLowerCase());
            case FilterType.LESS_THAN: return this.getValue(creature) < parseFloat(testVal);
            case FilterType.LESS_THAN_EQUALS: return this.getValue(creature) <= parseFloat(testVal);
            case FilterType.GREATER_THAN: return this.getValue(creature) > parseFloat(testVal);
            case FilterType.GREATER_THAN_EQUALS: return this.getValue(creature) >= parseFloat(testVal);
            default: return false;
        }
    }).bind(this);
    constructor(displayName: string, keyName: string){
        super(displayName, keyName.toLowerCase());
    }
}

class KeyedStringStatValue extends StatValue{
    override getValue = ((creature: Creature): string => {
        return creature[this.keyName] as string;
    }).bind(this);
    // override initializeCreatureObject(creature: Creature){ /* let value = parseFloat(creature[this.keyName] as string); if(isNaN(value)) return; else creature.abilities[this.keyName] = value; */ }
    override sort = ((creature1: Creature, creature2: Creature): number => {
        const creature1Val = this.getValue(creature1);
        const creature2Val = this.getValue(creature2);
        if (creature1Val == "N/A") return Number.MAX_SAFE_INTEGER;
        if (creature2Val == "N/A") return Number.MIN_SAFE_INTEGER;
        return creature1Val.localeCompare(creature2Val) * ((sortAscending) ? -1 : 1);
    }).bind(this)
    override filter = ((creature: Creature, filterType: FilterType, testVal: string): boolean => {
        switch(filterType){
            case FilterType.EQUALS: return this.getValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getValue(creature).toLowerCase().includes(testVal.toLowerCase());
            default: return false;
        }
    }).bind(this);
    constructor(displayName: string, keyName: string){
        super(displayName, keyName);
    }
}

class AbilityStringStatValue extends StatValue{
    override getValue = ((creature: Creature): string => {
        let searchString = creature.passive;
        let indexOf = searchString.indexOf(this.keyName);
        if(indexOf == -1) {
            searchString = creature.activated;
            indexOf = searchString.indexOf(this.keyName);
        }
        if(indexOf == -1) return "N/A";
        let abilityNameEndIndex = indexOf+this.keyName.length;
        let abilityValue = searchString.substring(searchString.indexOf("(", abilityNameEndIndex)+1, searchString.indexOf(")", abilityNameEndIndex))
        return abilityValue;
    }).bind(this);
    // override initializeCreatureObject(creature: Creature){ /* let value = parseFloat(creature[this.keyName] as string); if(isNaN(value)) return; else creature.abilities[this.keyName] = value; */ }
    override sort = ((creature1: Creature, creature2: Creature): number => {
        const creature1Val = this.getValue(creature1);
        const creature2Val = this.getValue(creature2);
        if (creature1Val == "N/A") return Number.MAX_SAFE_INTEGER;
        if (creature2Val == "N/A") return Number.MIN_SAFE_INTEGER;
        return creature1Val.localeCompare(creature2Val) * ((sortAscending) ? -1 : 1);
    }).bind(this);
    override filter = ((creature: Creature, filterType: FilterType, testVal: string): boolean => {
        switch(filterType){
            case FilterType.EQUALS: return this.getValue(creature).toLowerCase() == testVal.toLowerCase();
            case FilterType.CONTAINS: return this.getValue(creature).toLowerCase().includes(testVal.toLowerCase());
            default: return false;
        }
    }).bind(this);
    constructor(displayName: string, keyName: string){
        super(displayName, keyName.toLowerCase());
    }
}

function initializeStatList(){
    statList.push(new KeyedStringStatValue("Name", "common"));
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
    statList.push(new KeyedNumberStatValue("Tail Damage", "damage2"));
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
    statList.push(new KeyedNumberStatValue("Minimum Age to Jump", "jumpAge"));
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
    statList.push(new ValuelessAbilityStat("Toxic Trap", "Toxic Trap"));
    statList.push(new ValuelessAbilityStat("Sticky Trap", "Sticky Trap"));
    statList.push(new ValuelessAbilityStat("Speed Steal", "Speed Steal"));
    statList.push(new ValuelessAbilityStat("Speed Blitz", "Speed Blitz"));
    statList.push(new ValuelessAbilityStat("Escape Area", "Escape Area"));
    statList.push(new ValuelessAbilityStat("Change Weather", "Change Weather"));
    statList.push(new ValuelessAbilityStat("Area Food Restore", "Area Food Restore"));
    statList.push(new ValuelessAbilityStat("Area Water Restore", "Area Water Restore"));
    statList.push(new AbilityNumberStatValue("Diver", "Diver"));
    statList.push(new AbilityNumberStatValue("Hunker", "Hunker"));
    statList.push(new AbilityNumberStatValue("Burrower", "Burrower"));
    statList.push(new AbilityNumberStatValue("Radiation", "Radiation"));
    statList.push(new AbilityNumberStatValue("Healing Hunter", "Healing Hunter"));
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

async function initializeCreatureStats(): Promise<void>{
    return new Promise((resolve, reject) => {
        fetch("creatureStats.json").then(response => {
            response.body.getReader().read().then(async data => {
                let stats: object = JSON.parse(new TextDecoder("utf-8", {fatal: true, ignoreBOM: true}).decode(data.value));
                for (const [_, value] of Object.entries(stats)) {
                    initializeCreatureObject(value);
                    COSStatList.push(value);
                }
                console.log(COSStatList)
                resolve();
            }).catch(reject)
        }).catch(reject)
    })
}

function initializeCreatureObject(creature: Creature){
    creature.passive = creature.passive.toLowerCase();
    creature.activated = creature.activated.toLowerCase();
    creature.tableRow = document.createElement("tr");
    creature.tableRow.setAttribute("class", "hoverable");
    creature.tableRow.title = creature.common;
}

function addStatValueToCreatureRows(statValue: StatValue){
    for(let i = 0; i < COSStatList.length; i++){
        const newCell = document.createElement("td");
        newCell.style.textAlign = "center";
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

function removeStatValueFromCreatureRows(index: number){
    for(let i = 0; i < COSStatList.length; i++){
        COSStatList[i].tableRow.children[index].remove()
    }
}

function getSelectedStatValueWithKeyName(keyName: string): StatValue | null{
    for(let i = 0; i < selectedStats.length; i++){
        if(selectedStats[i].keyName == keyName) return selectedStats[i];
    }
    return null;
}
function getStatValueWithKeyName(keyName: string): StatValue | null{
    for(let i = 0; i < statList.length; i++){
        if(statList[i].keyName == keyName) return statList[i];
    }
    return null;
}

function updateCreatureStatsTable(){
    if(COSStatList.length == 0) return; //it's not initialized yet!

    console.time("updateTable");
    const statTableBody = STAT_LIST_TABLE.querySelector("tbody");
    statTableBody.remove();

    filterCreatures();
    let tableHeaderRow = STAT_LIST_TABLE.querySelector("thead").querySelector("tr");
    const headerCells = tableHeaderRow.children;
    const headerCellsKeyNames: string[] = [];
    for(let i = 0; i < headerCells.length; i++){
        const cell = headerCells[i];
        const keyName = cell.getAttribute("data-keyname");

        if(getSelectedStatValueWithKeyName(keyName) != null){
            headerCellsKeyNames.push(keyName);
        } else {
            cell.remove();
            removeStatValueFromCreatureRows(i)
            --i;
        }
    }

    for(let i = 0; i < selectedStats.length; i++){
        const statValue = selectedStats[i];
        if(!headerCellsKeyNames.includes(statValue.keyName)){
            let newCell = document.createElement("th");
            newCell.setAttribute("scope", "col");
            newCell.setAttribute("data-keyname", statValue.keyName);
            newCell.style.userSelect = "none";
            newCell.style.cursor = "cell";
            newCell.addEventListener("click", () => onHeaderCellClick(newCell));
            newCell.textContent = statValue.displayName;
            tableHeaderRow.appendChild(newCell);
            addStatValueToCreatureRows(statValue);
        }
    }

    if(sortDirty){
        const wasAscending = sortAscending;
        sortAscending = false;
        COSStatList.sort(nameStat.sort);
        sortAscending = wasAscending;

        COSStatList.sort(sortFunction);
        const rowsToAppend: HTMLTableRowElement[] = [];
        for(const creature of COSStatList) rowsToAppend.push(creature.tableRow);
        statTableBody.replaceChildren(...rowsToAppend);
        sortDirty = false;
    }
    STAT_LIST_TABLE.appendChild(statTableBody);
    console.timeEnd("updateTable");
}

function applyFilters(){
    activeFilters = [];
    for(const div of FILTER_CONTAINING_DIV.children){
        if(div.id == "floatingWindow") continue;

        const statTypeIndex = Number((div.querySelector("button[name='statTypeSelect']") as HTMLButtonElement).value);
        if(isNaN(statTypeIndex) || statTypeIndex == -1) continue;

        const filterType = getFilterTypeFromValue(div.querySelector("select").value);
        if(filterType == null) continue;

        const inputtedText: string = (div.querySelector("input[type='text']") as HTMLInputElement).value;
        const reverseFilter = (div.querySelector("label").querySelector("input[type='checkbox']") as HTMLInputElement).checked;
        activeFilters.push(new Filter(statList[statTypeIndex], filterType, inputtedText, reverseFilter))
    }
    updateCreatureStatsTable();
}

function filterCreatures(){
    for(const creature of COSStatList){
        let matchesAllFilters = true;
        for(const filter of activeFilters){
            if(!filter.test(creature)){
                matchesAllFilters = false;
                break;
            }
        }

        if(matchesAllFilters){
            if(creature.tableRow.style.display != "table-row") creature.tableRow.style.display = "table-row";
        } else {
            if(creature.tableRow.style.display != "none") creature.tableRow.style.display = "none";
        }
    }
}

function getFilterTypeFromValue(value: string){
    switch(value){
        case "equals": return FilterType.EQUALS;
        case "contains": return FilterType.CONTAINS;
        case "lessThan": return FilterType.LESS_THAN;
        case "lessThanEquals": return FilterType.LESS_THAN_EQUALS;
        case "greaterThan": return FilterType.GREATER_THAN;
        case "greaterThanEquals": return FilterType.GREATER_THAN_EQUALS;
        default: return null;
    }
}

function sleep(ms: number): Promise<void> { return new Promise(resolve => setTimeout(resolve, ms)); }

function onHeaderCellClick(headerCell: HTMLTableCellElement){
    const prevSortFunction = sortFunction;
    sortFunction = selectedStats[headerCell.cellIndex].sort;
    if(prevSortFunction == sortFunction){
        sortAscending = !sortAscending;
    } else {
        sortAscending = false;
    }
    sortDirty = true;
    updateCreatureStatsTable();
}

function openChooseTypeMenu(button: HTMLButtonElement){
    button.parentElement.after(FLOATING_WINDOW);
    FLOATING_WINDOW_SEARCH_BAR.oninput = chooseTypeSearchBarUpdate; 

    const rows: HTMLTableRowElement[] = [];
    for(let i = 0; i < statList.length; i++){
        const statValue: StatValue = statList[i];
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        cell.textContent = statValue.displayName;
        cell.setAttribute("class", "clickableButton");
        cell.addEventListener("click", () => {
            closeFloatingWindow();
            button.value = String(i);
            button.textContent = statValue.displayName;
        })
        row.appendChild(cell);
        rows.push(row);
    }

    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren(...rows);
    FLOATING_WINDOW.style.display = "block";
}

function chooseTypeSearchBarUpdate(){
    const searchTerm = FLOATING_WINDOW_SEARCH_BAR.value.toLowerCase();
    const tableRows = FLOATING_WINDOW_TABLE.querySelector("tbody").children;
    for(let i = 0; i < tableRows.length; i++){
        const tableRow = tableRows[i] as HTMLTableRowElement;
        const textContent = tableRow.querySelector("td").textContent.toLowerCase();
        if(textContent.includes(searchTerm)){
            tableRow.style.display = "table-row";
        } else {
            tableRow.style.display = "none";
        }
    }
}

function createFilter(): HTMLDivElement{
    const div = document.createElement("div");
    const button = document.createElement("button"); //div.querySelector("button[name='statTypeSelect']")
    button.name = "statTypeSelect";
    button.value = "-1";
    button.textContent = "SELECT STAT TYPE";
    button.addEventListener("click", () => {
        openChooseTypeMenu(button);
    })
    const deleteFilterButton = document.createElement("button");
    deleteFilterButton.name = "deleteFilter";
    deleteFilterButton.textContent = "Delete";
    deleteFilterButton.style.marginLeft = "5px";
    deleteFilterButton.addEventListener("click", () => {
        deleteFilterButton.closest("div").remove();
    })
    const select = document.createElement("select");
    select.name = "equalityType";
    select.append(createOption("equals", "EQUALS"), createOption("contains", "CONTAINS"), createOption("lessThan", "<"), createOption("lessThanEquals", "≤"), createOption("greaterThan", ">"), createOption("greaterThanEquals", "≥"));
    const textInput = document.createElement("input");
    textInput.type = "text";
    const label = document.createElement("label");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.name = "reverseCheckbox";
    
    label.append(checkbox, "Reverse");
    div.append(button, select, textInput, label, deleteFilterButton);
    return div;
}

function createOption(value: string, text: string): HTMLOptionElement{
    const option = document.createElement("option");
    option.value = value;
    option.textContent = text;
    return option;
}

function openConfigureTypesMenu(){
    CONFIGURE_STAT_TYPES_BUTTON.after(FLOATING_WINDOW);
    FLOATING_WINDOW_SEARCH_BAR.oninput = configureTypesSearchBarUpdate; 

    const rows: HTMLTableRowElement[] = [];
    const selectAllRow = document.createElement("tr");
    const cell = document.createElement("td");
    const selectAllCheckbox = document.createElement("input");
    selectAllCheckbox.id = `selectAllStats`;
    selectAllCheckbox.type = "checkbox";
    selectAllCheckbox.checked = selectedStats.length == statList.length;
    selectAllCheckbox.addEventListener("change", () => {
        if(selectAllCheckbox.checked){
            for(const stat of statList){
                if(!selectedStats.includes(stat)) selectedStats.push(stat);
            }
        } else {
            selectedStats = [];
        }
        for(const row of FLOATING_WINDOW_TABLE.querySelector("tbody").children){
            row.querySelector("input").checked = selectAllCheckbox.checked;
        }

        updateCreatureStatsTable();
    });
    const label = document.createElement("label");
    label.setAttribute("for", "selectAllStats");
    label.textContent = "Select All";
    cell.append(selectAllCheckbox, label);
    selectAllRow.appendChild(cell);
    rows.push(selectAllRow);

    for(let i = 0; i < statList.length; i++){
        const statValue: StatValue = statList[i];
        const row = document.createElement("tr");
        const cell = document.createElement("td");
        const checkbox = document.createElement("input");
        checkbox.id = `${statValue.keyName}checkBox`;
        checkbox.type = "checkbox";
        checkbox.checked = getSelectedStatValueWithKeyName(statValue.keyName) != null;
        checkbox.addEventListener("change", () => {
            const indexOfStatValue = selectedStats.indexOf(statValue);
            if(indexOfStatValue != -1){
                selectedStats.splice(indexOfStatValue, 1);
            } else {
                selectedStats.push(statValue);
            }
            updateCreatureStatsTable();
        });
        const label = document.createElement("label");
        label.setAttribute("for", `${statValue.keyName}checkBox`);
        label.textContent = statValue.displayName;

        cell.append(checkbox, label);
        row.appendChild(cell);
        rows.push(row);
    }

    FLOATING_WINDOW_TABLE.querySelector("tbody").replaceChildren(...rows);
    FLOATING_WINDOW.style.display = "block";
}

function configureTypesSearchBarUpdate(){
    const searchTerm = FLOATING_WINDOW_SEARCH_BAR.value.toLowerCase();
    const tableRows = FLOATING_WINDOW_TABLE.querySelector("tbody").children;
    for(let i = 0; i < tableRows.length; i++){
        const tableRow = tableRows[i] as HTMLTableRowElement;
        const textContent = tableRow.querySelector("td").querySelector("label").textContent.toLowerCase();
        if(textContent.includes(searchTerm)){
            tableRow.style.display = "table-row";
        } else {
            tableRow.style.display = "none";
        }
    }
}

function closeFloatingWindow(){
    FLOATING_WINDOW_SEARCH_BAR.oninput = null;
    FLOATING_WINDOW_SEARCH_BAR.value = "";
    FLOATING_WINDOW.style.display = "none";
}

function onFrame(time: DOMHighResTimeStamp){
    FLOATING_WINDOW.querySelector("img").style.top = `${FLOATING_WINDOW.scrollTop}px`;
    requestAnimationFrame(onFrame);
}

(async () => { //START
    const initializeCreatureStatsPromise = initializeCreatureStats();
    initializeStatList();
    nameStat = getStatValueWithKeyName("common");
    selectedStats.push(nameStat);
    selectedStats.push(getStatValueWithKeyName("diet"));
    selectedStats.push(getStatValueWithKeyName("tier"));

    sortFunction = nameStat.sort;
    sortAscending = false;
    sortDirty = true;

    FLOATING_WINDOW.querySelector("img").addEventListener("click", closeFloatingWindow)
    CONFIGURE_STAT_TYPES_BUTTON.addEventListener("click", openConfigureTypesMenu)
    document.getElementById("applyFilters").addEventListener("click", () => {
        applyFilters();
    })
    document.getElementById("createFilter").addEventListener("click", () => {
        FILTER_CONTAINING_DIV.appendChild(createFilter())
    });

    FILTER_CONTAINING_DIV.appendChild(createFilter())
    initializeCreatureStatsPromise.then(() => {
        updateCreatureStatsTable();
    })
    requestAnimationFrame(onFrame);
})()