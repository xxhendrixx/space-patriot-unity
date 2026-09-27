using System;
using System.IO;
using SpacePatriot;
using UnityEngine;

/// <summary>Checks real PhysX deck queries and occupied berths at both player ports.</summary>
public static class FreightBerthValidation
{
    public static void Run()
    {
        var records=JsonUtility.FromJson<WorldCatalog>(Resources.Load<TextAsset>("Worlds").text).worlds;
        var root=new GameObject("Freight berth validation world");
        try
        {
            var world=root.AddComponent<FrontierWorld>();world.info=records[0];
            float deck=world.Deck;
            Floor(root.transform,"Structural collision",new Vector3(165,deck-8,0),new Vector3(480,16,480));
            Floor(root.transform,"Lift deck collision",new Vector3(0,deck-.5f,0),new Vector3(136,1,235));
            Floor(root.transform,"Capital landing quay",new Vector3(650,deck-1.5f,230),new Vector3(460,3,360));
            world.places.Add(new Place("Port 07 landing pad","landing",new Vector3(0,deck+2.65f,0),62));
            world.places.Add(new Place("Capital ship apron","landing",new Vector3(165,deck+2.65f,155),75));
            world.places.Add(new Place("Capital ship quay","landing",new Vector3(650,deck+2.65f,230),145));
            Physics.SyncTransforms();
            var courier=ShipSpec.Fleet[70];var large=ShipSpec.Fleet[90];
            Check(FreightLogistics.TryBerth(world,large,new Vector3(0,deck+4,0),Quaternion.identity,
                courier,true,out var port,out var local)&&local&&port.x>300&&port.x<400&&port.z<0&&
                Vector3.Distance(port,new Vector3(0,deck+4,0))<400&&
                world.TryLandingDeck(port,1,large.height, out _,out _,out var portFloor)&&
                portFloor.name=="Structural collision",
                "A large freight ship lands on the constructed Port 07 slab within sight of a player outside the hangar");
            Check(FreightLogistics.TryBerth(world,large,new Vector3(840,deck+4,230),Quaternion.identity,
                courier,true,out var cityWest,out local)&&local&&cityWest.x<650&&
                world.TryLandingDeck(cityWest,1,large.height,out _,out _,out var cityFloor)&&
                cityFloor.name=="Capital landing quay",
                "Freight switches to the western capital bay when the player occupies the eastern quay");
            Check(FreightLogistics.TryBerth(world,large,new Vector3(580,deck+4,230),Quaternion.identity,
                courier,true,out var cityEast,out local)&&local&&cityEast.x>700&&
                Vector3.Distance(cityEast,cityWest)>large.width+8,
                "Freight uses the eastern capital bay when the player parks in the western bay");
            Check(FreightLogistics.TryBerth(world,large,port,Quaternion.identity,large,true,
                out var alternate,out local)&&!local&&alternate.x>500,
                "An occupied Port 07 freight pad is never reused by a second full-size hull");
            Check(FreightLogistics.TryBerth(world,large,new Vector3(0,deck+4,0),Quaternion.identity,
                courier,false,out var unattended,out local)&&!local&&unattended.x>700,
                "Unattended freight uses the capital quay rather than following an airborne player");
            Directory.CreateDirectory("Validation");
            File.WriteAllText("Validation/freight-berths.txt",
                "PASS: Port 07 occupied/unoccupied, capital quay east/west bays, real PhysX deck support and airborne player fallback.\n");
            Debug.Log("FREIGHT_BERTH_VALIDATION_PASS");
        }
        finally{UnityEngine.Object.DestroyImmediate(root);}
    }

    static void Floor(Transform root,string name,Vector3 center,Vector3 size)
    {
        var floor=new GameObject(name);floor.transform.SetParent(root,false);
        floor.transform.localPosition=center;floor.AddComponent<BoxCollider>().size=size;
    }

    static void Check(bool condition,string explanation)
    {if(!condition)throw new Exception("Freight berth regression: "+explanation);}
}
