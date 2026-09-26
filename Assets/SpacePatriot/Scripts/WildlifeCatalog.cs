using System;
using System.Linq;
using UnityEngine;

namespace SpacePatriot
{
    [Serializable] public sealed class CreatureRosterCatalog { public CreatureWorldRoster[] worlds; }
    [Serializable] public sealed class CreatureWorldRoster { public string world,name,biome; public int seed; public CreatureSpecies[] fauna; }
    [Serializable] public sealed class CreatureSpecies
    {
        public string id,name,world,biome,role,model; public int family,variant,seed; public string[] palette,abilities;
        public float height,health,damage,aggression,detection;
        public CreatureConcept concept;
        public bool Boss => role=="champion"||role=="apex";
    }
    [Serializable] public sealed class CreatureConcept
    { public string silhouette,habitat,behavior,prompt; public string[] views; public CreatureMeasure measure; }
    [Serializable] public sealed class CreatureMeasure { public string units,origin,up,forward; }

    public static class WildlifeCatalog
    {
        static CreatureRosterCatalog catalog;
        public static CreatureSpecies[] For(string world)
        {
            if(catalog==null){var asset=Resources.Load<TextAsset>("CreatureRosters");if(asset==null)return Array.Empty<CreatureSpecies>();catalog=JsonUtility.FromJson<CreatureRosterCatalog>(asset.text);}
            return catalog.worlds.FirstOrDefault(x=>x.world==world)?.fauna??Array.Empty<CreatureSpecies>();
        }
    }
}
