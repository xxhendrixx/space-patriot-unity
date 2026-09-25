using System;
using System.Collections.Generic;
using UnityEngine;
using static SpacePatriot.IndustrialArt;
namespace SpacePatriot
{
    public static class CityRoutes
    {
        public const float Spine=450;
        public static readonly Vector2[] Stops={new(650,260),new(470,70),new(520,-310),new(680,-115),new(520,-115),new(680,-310),new(680,-505),new(165,95),new(285,95),new(285,-95)};
        public static float Distance(int a,int b){var p=Stops[a%Stops.Length];var q=Stops[b%Stops.Length];return Mathf.Abs(p.x-Spine)+Mathf.Abs(p.y-q.y)+Mathf.Abs(q.x-Spine);}
    }
    public partial class FrontierWorld
    {
        public SettlementInfo settlement;
        public readonly List<Vector3> cityCheckpoints=new();
        void CityDistricts()
        {
            var root=Root("Settlement districts / "+settlement.name,content);int style=Math.Abs(settlement.seed%4);cityCheckpoints.Clear();
            var stone=Resources.Load<Material>("OriginalSurfaces/city-"+(style*3));
            var wall=Resources.Load<Material>("OriginalSurfaces/habitat-"+(style*2));
            var accent=Metal("District accent "+style,new[]{new Color(.24f,.35f,.32f),new Color(.55f,.32f,.16f),new Color(.30f,.38f,.45f),new Color(.47f,.46f,.32f)}[style],.28f,.8f);
            Box("Capital landing quay",root,new Vector3(650,Deck-1.5f,230),new Vector3(460,3,360),stone,true);
            Box("Dock connection",root,new Vector3(408,Deck-1.5f,160),new Vector3(60,3,42),stone,true);
            Box("Central utility boulevard",root,new Vector3(CityRoutes.Spine,Deck-1.5f,-100),new Vector3(30,3,870),stone,true);
            places.Add(new Place("Capital ship quay","landing",new Vector3(650,Deck+2.65f,230),145));
            string[] names={"PORT CONTROL","FREIGHT / LOGISTICS","WATERWORKS / UTILITIES","MARKET / EXCHANGE","CLINIC / RESEARCH","HABITATION / COMMONS","HYDROPONICS / FOOD"};
            var buildings=JsonUtility.FromJson<BuildingCatalog>(Resources.Load<TextAsset>("Buildings").text).buildings;
            for(int node=0;node<7;node++){
                var stop=CityRoutes.Stops[node];var center=new Vector3(stop.x,Deck,stop.y);cityCheckpoints.Add(center);
                var district=Root(names[node],root,center);Box("Public service square",district,new Vector3(0,-1.5f,0),new Vector3(112,3,100),stone,true);
                Box("Street connection",root,new Vector3((stop.x+CityRoutes.Spine)*.5f,Deck-1.45f,stop.y),new Vector3(Mathf.Abs(stop.x-CityRoutes.Spine)+8,2.9f,16),stone,true);
                Terminal(district,new Vector3(0,0,-5),names[node],Cyan);places.Add(new Place(names[node],"city-"+node,center+new Vector3(0,0,-5),4));
                Label(district,names[node],new Vector3(0,4,-8),.075f,new Color(.83f,.85f,.75f));
                if(node==0){for(int i=0;i<5;i++){float x=-42+i*20;Strip(district,new Vector3(x,.015f,23),new Vector3(12,.025f,.35f),Orange);}continue;}
                // Original walkable building interiors sit behind the public squares; lifts retain their actual machinery.
                var spec=buildings[(node+style)%buildings.Length];var b=Original(spec.model,center+new Vector3(0,-1,-32),district);b.position=center+new Vector3(0,-1,-32);
                foreach(var col in spec.colliders)if(col.kind!="ceiling")StructureCollider(b,new Vector3(col.center[0],col.center[1],-col.center[2]),new Vector3(col.size[0],col.size[1],col.size[2]),col.kind,-col.rotationY*Mathf.Rad2Deg);
                var elevator=b.gameObject.AddComponent<BuildingLift>();elevator.levels=spec.levels;elevator.baseHeight=1.06f;
                for(int side=-1;side<=1;side+=2){float x=side*39;int storeys=settlement.kind=="outpost"?2:3+(settlement.seed+node*7+(side+1))%7;
                    var tower=Root("Stepped service block",district,new Vector3(x,0,-26));
                    for(int level=0;level<storeys;level++){float taper=level>storeys-3?2:0;Box("Floor slab",tower,new Vector3(0,level*3.6f+.25f,0),new Vector3(24-taper,.5f,27-taper),Steel);
                        for(int s=-1;s<=1;s+=2){Box("Insulated shear wall",tower,new Vector3(s*(11-taper*.5f),level*3.6f+1.9f,0),new Vector3(1,3.5f,26-taper),wall,true);
                            Box("Weather canopy",tower,new Vector3(0,level*3.6f+3.25f,s*(13-taper*.5f)),new Vector3(23-taper,.18f,1.5f),accent);
                            for(int k=0;k<5;k++){Box("Recessed window",tower,new Vector3(-8+k*4,level*3.6f+1.85f,s*(12.9f-taper*.5f)),new Vector3(2.5f,1.85f,.18f),Dark);Box("Window mullion",tower,new Vector3(-8+k*4,level*3.6f+1.85f,s*(13.02f-taper*.5f)),new Vector3(.08f,1.85f,.10f),Steel);}
                        }
                    }
                    Box("Roof equipment plinth",tower,new Vector3(0,storeys*3.6f,0),new Vector3(20,.4f,22),accent);
                    for(int k=0;k<3;k++){Cylinder("Ventilation plant",tower,new Vector3(-5+k*5,storeys*3.6f+1,3),1.25f,1.8f,Steel);for(int n=0;n<5;n++)Box("Radiator slat",tower,new Vector3(-6+k*5+n*.5f,storeys*3.6f+1.9f,3),new Vector3(.12f,.08f,1.8f),Dark);}
                    Beam(tower,new Vector3(-9,1,11),new Vector3(-9,storeys*3.6f,11),.3f,accent);
                    // Arcaded ground frontage, benches and visible utility routes give each street a human scale.
                    for(int k=0;k<4;k++)Box("Arcade column",tower,new Vector3(-9+k*6,1.6f,16),new Vector3(.55f,3.2f,.55f),Steel,true);
                    Box("Covered sidewalk",tower,new Vector3(0,3.3f,15),new Vector3(25,.3f,7),accent);
                }
                for(int side=-1;side<=1;side+=2){Box("Public bench",district,new Vector3(side*17,.48f,8),new Vector3(4,.16f,1.2f),accent,true);for(int a=-1;a<=1;a+=2)Box("Bench footing",district,new Vector3(side*17+a*1.4f,.23f,8),new Vector3(.22f,.45f,1.0f),Steel);
                    Box("Raised planter",district,new Vector3(side*24,.50f,20),new Vector3(7,1,3),wall,true);Box("Planter soil",district,new Vector3(side*24,1.02f,20),new Vector3(6.6f,.06f,2.6f),Dark);
                    var plant=Resources.Load<GameObject>("OriginalShips/"+(info.biome=="temperate"?"conifer":"alien-flora-"+(node%3)));var flora=Instantiate(plant,district).transform;flora.localPosition=new Vector3(side*24,1.0f,20);flora.localScale=Vector3.one*.9f;
                    Cylinder("Area light mast",district,new Vector3(side*43,3.0f,34),.08f,6,Steel);Box("Area fixture",district,new Vector3(side*43,6,34),new Vector3(1.8f,.13f,.45f),WarmLight);
                }
                if(node==2)for(int i=0;i<3;i++){Cylinder("Water processing vessel",district,new Vector3(-20+i*20,4,37),4,8,accent);Beam(district,new Vector3(-20+i*20,2,37),new Vector3(-20+i*20,2,49),.65f,Steel);}
                if(node==6)for(int i=0;i<4;i++){Box("Hydroponic bed",district,new Vector3(-24+i*16,.7f,35),new Vector3(9,1.4f,18),Steel,true);for(int k=0;k<6;k++)Box("Crop tray",district,new Vector3(-24+i*16,1.45f,29+k*2.4f),new Vector3(8,.12f,1.7f),accent);}
            }
            for(int k=0;k<15;k++){float z=330-k*60;for(int side=-1;side<=1;side+=2){Strip(root,new Vector3(CityRoutes.Spine+side*10,Deck+.015f,z),new Vector3(.35f,.02f,30),Orange);Cylinder("Boulevard mast",root,new Vector3(CityRoutes.Spine+side*13,Deck+4,z),.10f,8,Steel);Box("Luminaire",root,new Vector3(CityRoutes.Spine+side*13,Deck+8,z),new Vector3(1.6f,.14f,.6f),WarmLight);}}
            var transit=Root("Automated district shuttle",content);var shuttle=transit.gameObject.AddComponent<DistrictShuttle>();shuttle.deck=Deck;
            MeshObject("Formed transit body",transit,HullMesh(new[]{-5f,-3.8f,3.8f,5},new[]{2.1f,3,3,2.1f},new[]{2.1f,2.6f,2.6f,2.1f},new[]{0f,0,0,0},"District tram"),accent,new Vector3(0,1.65f,0),Vector3.one);
            for(int side=-1;side<=1;side+=2)for(int k=0;k<4;k++)Box("Tram window",transit,new Vector3(side*1.51f,2,-3+k*2),new Vector3(.05f,1.1f,1.5f),Dark);
        }
    }
    public class DistrictShuttle:MonoBehaviour
    {
        public float deck;float distance;
        void Update(){distance=(distance+Time.deltaTime*14)%1920;float z=distance<960?350-distance:-610+(distance-960);transform.position=new Vector3(CityRoutes.Spine+(distance<960?4:-4),deck,z);transform.rotation=Quaternion.Euler(0,distance<960?180:0,0);}
    }
}
