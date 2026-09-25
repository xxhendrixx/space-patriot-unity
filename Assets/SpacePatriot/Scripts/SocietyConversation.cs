using UnityEngine;
namespace SpacePatriot
{
    public static class SocietyConversation
    {
        public static string Request(string person)=>person=="vale"?"Seren Vale: Six alloy for thirty rifle rounds. The Union remembers a counted delivery.":person=="rook"?"Ivo Rook: Bring three repair components. I will clear your crew with the Compact.":"Dr. Mara Sol: Bring one field sample. I can assay it into eight alloy and credit the Union research ledger.";
        public static bool Deliver(SaveData save,Resident r)
        {
            if(!r.contractRequested||r.contractPaid||r.city!=save.settlement)return false;
            if(r.person=="vale"){if(save.inventory.alloy<6||save.ammo[3].reserve>9969||FieldInventory.Weight(save)+.09f>200)return false;save.inventory.alloy-=6;save.ammo[3].reserve+=30;save.union=Mathf.Clamp(save.union+15,-100,100);}
            else if(r.person=="rook"){if(save.vessel.spares<3)return false;save.vessel.spares-=3;save.helix=Mathf.Max(5,save.helix);}
            else if(r.person=="mara"){if(save.inventory.samples<1||save.inventory.alloy>9991||FieldInventory.Weight(save)+.38f>200)return false;save.inventory.samples--;save.inventory.alloy+=8;save.union=Mathf.Clamp(save.union+15,-100,100);}
            else return false;r.contractPaid=true;r.friendship+=15;return true;
        }
    }
}
