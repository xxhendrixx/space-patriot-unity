using UnityEngine;
using static SpacePatriot.IndustrialArt;
namespace SpacePatriot
{
    public partial class FrontierWorld
    {
        void BiomePopulation()
        {
            var rand=new System.Random(info.seed^71831);bool living=info.biome=="temperate";
            var tree=living?Resources.Load<GameObject>("OriginalShips/"+(info.id=="earth"?"conifer":"alien-flora-"+Mathf.Abs(info.seed%3))):null;
            int wanted=living?440:150;
            for(int i=0;i<wanted;i++){
                float angle=(float)rand.NextDouble()*Mathf.PI*2,r=450+(float)rand.NextDouble()*1400;float x=Mathf.Cos(angle)*r,z=Mathf.Sin(angle)*r;
                var sample=terrainFields.Sample(x,z);float h=Height(x,z);if(h<0||new Vector2(x-outpost.x,z-outpost.z).magnitude<85||new Vector2(x-grove.x,z-grove.z).magnitude<30)continue;
                float slope=Mathf.Abs(Height(x+8,z)-h)+Mathf.Abs(Height(x,z+8)-h);
                if(living&&tree&&slope<12&&sample.y>.25f){var plant=Instantiate(tree,content).transform;plant.position=new Vector3(x,h,z);float size=1.1f+(float)rand.NextDouble()*2;plant.localScale=new Vector3(size,size*(1+(float)rand.NextDouble()*.5f),size);plant.localRotation=Quaternion.Euler(0,(float)rand.NextDouble()*360,0);}
                else if(!living&&info.biome!="gas"){
                    var root=Root(info.biome+" geological formation",content,new Vector3(x,h,z));float scale=4+(float)rand.NextDouble()*14;
                    // Real strata: offset eroded masses with alternating original geology surfaces.
                    int layers=info.biome=="desert"?5:info.biome=="ice"?3:4;
                    for(int k=0;k<layers;k++){var mat=Resources.Load<Material>("OriginalSurfaces/geology-"+(info.biome=="ice"?9+k%2:info.biome=="desert"?1+k%2:info.biome=="volcanic"?13+k%2:7+k%3));
                        var mesh=HullMesh(new[]{-scale*.50f,-scale*.34f,scale*.35f,scale*.51f},new[]{scale*.67f,scale,scale*.91f,scale*.55f},new[]{scale*.18f,scale*.30f,scale*.27f,scale*.15f},new[]{0f,scale*.05f,0,0},"Geology "+info.id+" "+i+" "+k);
                        var g=MeshObject("Layered bedrock",root,mesh,mat,new Vector3(k*.2f,k*scale*.21f,0),Vector3.one*(1-k*.06f));g.transform.localRotation=Quaternion.Euler(0,k*12+info.seed%31,info.biome=="ice"?k*12:0);}
                }
            }
            // Functional apron detail, organized around clear traffic and walking routes.
            var freight=Root("Freight service infrastructure",content,new Vector3(310,Deck,85));
            for(int i=0;i<6;i++){var at=new Vector3(i%3*7,1.6f,i/3*11);Box("Corrugated freight module",freight,at,new Vector3(5,3.2f,8),Resources.Load<Material>("OriginalSurfaces/machinery-3"),true);for(int k=0;k<9;k++)Box("Reinforced corner and side ribs",freight,at+new Vector3(-2.54f,0,-3.6f+k*.9f),new Vector3(.12f,3.15f,.10f),Steel);}
            Beam(freight,new Vector3(-5,0,-8),new Vector3(-5,13,-8),.5f,Steel);Beam(freight,new Vector3(23,0,-8),new Vector3(23,13,-8),.5f,Steel);Beam(freight,new Vector3(-5,13,-8),new Vector3(23,13,-8),.65f,Steel);Cylinder("Freight hoist cable",freight,new Vector3(10,9,-8),.05f,7,Dark);
        }
    }
}
