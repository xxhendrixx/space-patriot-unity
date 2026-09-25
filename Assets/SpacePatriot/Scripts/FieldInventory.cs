using System;
using UnityEngine;
namespace SpacePatriot
{
    [Serializable] public class FieldInventoryState {public int alloy=18,samples;public float cityPower=1;}
    public static class FieldInventory
    {
        public static float Weight(SaveData s)=>s.ammo[3].reserve*.015f+s.ammo[4].reserve*.01f+s.vessel.spares*.04f+s.inventory.alloy*.06f+s.inventory.samples*.1f;
        // Atomic original Inventoryworks recipes. Existing ammo/repair consumers
        // remain the single source of truth instead of duplicate reserve counters.
        public static bool Craft(SaveData s,string recipe,bool atPoweredTerminal)
        {
            if(!atPoweredTerminal)return false;int alloy=s.inventory.alloy,samples=s.inventory.samples,rounds=s.ammo[3].reserve;float spares=s.vessel.spares;
            if(recipe=="ammo"){if(alloy<6||rounds>9969)return false;alloy-=6;rounds+=30;}
            else if(recipe=="parts"){if(alloy<3||spares>9995)return false;alloy-=3;spares+=4;}
            else if(recipe=="analyze"){if(samples<1||alloy>9995)return false;samples--;alloy+=4;}else return false;
            float weight=rounds*.015f+s.ammo[4].reserve*.01f+spares*.04f+alloy*.06f+samples*.1f;if(weight>200)return false;
            s.inventory.alloy=alloy;s.inventory.samples=samples;s.ammo[3].reserve=rounds;s.vessel.spares=spares;return true;
        }
    }
    public partial class FrontierGame
    {
        float lastSample=-100;
        bool AtFabricator=>walking&&Vector3.Distance(walkPosition,new Vector3(49,world.Deck+1.75f,26))<4&&save.inventory.cityPower>.05f;
        void CollectFieldSample(){if(Time.time-lastSample<12){Toast("Survey collection recovering; move to another sample site.");return;}if(Vector3.Distance(walkPosition,world.grove)>300||CurrentWorld.biome=="gas"){Toast("Collect samples on solid ground near the survey station.");return;}if(FieldInventory.Weight(save)+.1f>200){Toast("Field inventory weight limit reached.");return;}save.inventory.samples++;lastSample=Time.time;Signal("sample");Save();Toast("Field sample secured. Analyze it at the powered fabrication terminal.");}
        void InventoryPanel(){var inv=save.inventory;Text("FIELD INVENTORY / INVENTORYWORKS",400,235,900,30,17,amber,true);
            Text("ALLOY  "+inv.alloy+"    SAMPLES  "+inv.samples+"    SPARES  "+save.vessel.spares.ToString("0"),400,296,900,34,23,paper,true);
            Text("AR-30 RESERVE  "+save.ammo[3].reserve+"    SIDEARM RESERVE  "+save.ammo[4].reserve+"\nCARRIED WEIGHT  "+FieldInventory.Weight(save).ToString("0.00")+" / 200 kg",400,350,900,86,20,muted);
            string[] ids={"ammo","parts","analyze"},labels={"6 ALLOY → 30 RIFLE ROUNDS","3 ALLOY → 4 REPAIR COMPONENTS","1 SAMPLE → 4 RECOVERED ALLOY"};for(int i=0;i<3;i++)if(Button(labels[i],400,464+i*64,910,48,false,AtFabricator)){bool ok=FieldInventory.Craft(save,ids[i],AtFabricator);Toast(ok?"Fabrication complete; inventory updated.":"Insufficient materials or inventory capacity.");if(ok)Save();}
            Text(AtFabricator?"FABRICATION BUS ONLINE":"Use the fabrication terminal beside port engineering to craft. Shift+B collects a field sample.",400,689,906,65,17,AtFabricator?aqua:muted);
        }
    }
}
