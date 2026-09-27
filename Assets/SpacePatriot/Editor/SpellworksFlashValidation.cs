using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using UnityEngine;
using UnityEngine.Rendering;
using Object=UnityEngine.Object;

/// <summary>Exercises the shipping Spellworks shader on the GPU at eye level.</summary>
public static class SpellworksFlashValidation
{
    public static void Run()
    {
        var shader=Resources.Load<Shader>("Shaders/Spellworks");
        if(shader==null||!shader.isSupported)throw new Exception("Spellworks shader is missing or unsupported");
        var material=new Material(shader);
        material.SetFloat("_DstBlend",(float)BlendMode.OneMinusSrcAlpha);
        var mesh=new Mesh{name="Spellworks flash regression quad"};
        mesh.vertices=Enumerable.Repeat(Vector3.zero,4).ToArray();
        mesh.uv=new[]{new Vector2(-.5f,-.5f),new Vector2(.5f,-.5f),new Vector2(.5f,.5f),new Vector2(-.5f,.5f)};
        mesh.colors=Enumerable.Repeat(new Color(1,.7f,.15f,1),4).ToArray();
        mesh.SetUVs(1,new List<Vector4>(Enumerable.Repeat(Vector4.zero,4)));
        mesh.SetUVs(2,new List<Vector4>(Enumerable.Repeat(new Vector4(.95f,1,.8f,.5f),4)));
        mesh.SetUVs(3,new List<Vector4>(Enumerable.Repeat(new Vector4(5,0,1,0),4)));
        mesh.triangles=new[]{0,1,2,0,2,3};
        mesh.bounds=new Bounds(Vector3.zero,Vector3.one*4);
        var previousTime=Shader.GetGlobalVector("_Time");
        var previousScreen=Shader.GetGlobalVector("_ScreenParams");
        var previousTarget=RenderTexture.active;
        try
        {
            var near=Render(mesh,material,.2f,1,256);
            var behind=Render(mesh,material,-.2f,1,256);
            var visible=Render(mesh,material,2,1,256);
            var overlap=Render(mesh,material,2,65,256);
            var large=Render(mesh,material,2,1,1024);
            Check(near.lit==0&&behind.lit==0,"near/behind camera particles are invisible");
            Check(visible.lit>0&&visible.width<=26&&visible.height<=26,"visible particle is bounded to 24 pixels");
            Check(large.lit>0&&large.width<=26&&large.height<=26,"pixel cap is resolution independent");
            Check(overlap.lit>0&&overlap.width<=26&&overlap.height<=26,"65 coincident particles cannot cover the screen");
            Check(overlap.green<.72f&&overlap.blue<.17f,"overlapping particles retain hue and do not turn white");
            string flameReport=ValidateFireworks();
            Directory.CreateDirectory("Validation");
            File.WriteAllText("Validation/spellworks-flash.txt",
                $"PASS: near/behind particles suppressed; 24px cap at 256 and 1024; 65 overlapping sparks remain nonwhite.\n"+
                $"Visible width={visible.width}px; high-resolution width={large.width}px; overlap green={overlap.green:F3}, blue={overlap.blue:F3}.\n"+
                flameReport);
            Debug.Log("SPELLWORKS_FLASH_VALIDATION_PASS");
        }
        finally
        {
            Shader.SetGlobalVector("_Time",previousTime);
            Shader.SetGlobalVector("_ScreenParams",previousScreen);
            RenderTexture.active=previousTarget;
            Object.DestroyImmediate(mesh);
            Object.DestroyImmediate(material);
        }
    }

    static void Check(bool valid,string description)
    {if(!valid)throw new Exception("Spellworks flash regression: "+description);}

    static string ValidateFireworks()
    {
        var shader=Resources.Load<Shader>("Shaders/Fireworks");
        Check(shader!=null&&shader.isSupported,"Fireworks shader is missing or unsupported");
        var material=new Material(shader);
        material.SetFloat("_Start",0);material.SetFloat("_End",8);material.SetFloat("_Scale",.5f);
        var mesh=new Mesh{name="Fireworks flash regression quad"};
        mesh.vertices=Enumerable.Repeat(Vector3.zero,4).ToArray();
        mesh.uv=new[]{new Vector2(-.5f,-.5f),new Vector2(.5f,-.5f),new Vector2(.5f,.5f),new Vector2(-.5f,.5f)};
        mesh.SetUVs(1,new List<Vector4>(Enumerable.Repeat(new Vector4(.12f,.8f,.5f,0),4)));
        mesh.triangles=new[]{0,1,2,0,2,3};
        try
        {
            var near=Render(mesh,material,0,1,256,true);
            var behind=Render(mesh,material,-2,1,256,true);
            var visible=Render(mesh,material,2,1,256,true);
            var overlap=Render(mesh,material,2,240,256,true);
            var large=Render(mesh,material,2,1,1024,true);
            Debug.Log($"FIREWORKS_FLASH_SAMPLES near={near.lit} behind={behind.lit} visible={visible.lit}/{visible.width}x{visible.height} overlap={overlap.lit}/{overlap.width}x{overlap.height} large={large.lit}/{large.width}x{large.height}");
            Check(near.lit==0&&behind.lit==0,"near/behind flame billboards are invisible");
            Check(visible.lit>0&&visible.width<=58&&visible.height<=58,"visible flame stays below 56 pixels");
            Check(large.lit>0&&large.width<=58&&large.height<=58,"flame cap is resolution independent");
            Check(overlap.lit>0&&overlap.width<=58&&overlap.height<=58,"240 overlapping flames cannot cover the screen");
            Check(overlap.green<.81f&&overlap.blue<.43f,"overlapping flames retain amber hue");
            return $"PASS: Fireworks near/behind suppression; 56px cap at 256 and 1024; 240 overlapping flames remain amber. Width={visible.width}px; overlap green={overlap.green:F3}, blue={overlap.blue:F3}.\n";
        }
        finally{Object.DestroyImmediate(mesh);Object.DestroyImmediate(material);}
    }

    static (int lit,int width,int height,float green,float blue) Render(Mesh mesh,Material material,float depth,int copies,int size,bool fireworks=false)
    {
        var target=new RenderTexture(size,size,24,RenderTextureFormat.ARGBFloat,RenderTextureReadWrite.Linear);
        target.Create();var texture=new Texture2D(size,size,TextureFormat.RGBAFloat,false,true);
        var previousTarget=RenderTexture.active;
        try
        {
            // Spellworks stores emission positions directly in world-space mesh vertices.
            mesh.vertices=Enumerable.Repeat(fireworks?Vector3.zero:new Vector3(0,0,depth),4).ToArray();
            mesh.bounds=new Bounds(fireworks?Vector3.zero:new Vector3(0,0,depth),Vector3.one*4);
            using(var command=new CommandBuffer{name="Spellworks flash GPU regression"})
            {
                command.SetRenderTarget(target);
                command.ClearRenderTarget(true,true,Color.black);
                command.SetViewport(new Rect(0,0,size,size));
                var view=Matrix4x4.Scale(new Vector3(1,1,-1));
                var projection=GL.GetGPUProjectionMatrix(Matrix4x4.Perspective(65,1,.08f,100),true);
                command.SetViewProjectionMatrices(view,projection);
                command.SetGlobalVector("_ScreenParams",new Vector4(size,size,1+1f/size,1+1f/size));
                command.SetGlobalVector("_Time",new Vector4(.05f,1,2,3));
                var matrix=fireworks?Matrix4x4.Translate(new Vector3(0,0,depth)):Matrix4x4.identity;
                for(int i=0;i<copies;i++)command.DrawMesh(mesh,matrix,material);
                Graphics.ExecuteCommandBuffer(command);
            }
            RenderTexture.active=target;
            texture.ReadPixels(new Rect(0,0,size,size),0,0,false);texture.Apply(false,false);
            int lit=0,minX=size,minY=size,maxX=-1,maxY=-1;float green=0,blue=0;
            var colors=texture.GetPixels();
            for(int y=0;y<size;y++)for(int x=0;x<size;x++)
            {
                var color=colors[y*size+x];green=Mathf.Max(green,color.g);blue=Mathf.Max(blue,color.b);
                if(color.r<.005f&&color.g<.005f&&color.b<.005f)continue;
                lit++;minX=Math.Min(minX,x);minY=Math.Min(minY,y);maxX=Math.Max(maxX,x);maxY=Math.Max(maxY,y);
            }
            return (lit,lit==0?0:maxX-minX+1,lit==0?0:maxY-minY+1,green,blue);
        }
        finally{RenderTexture.active=previousTarget;Object.DestroyImmediate(texture);target.Release();Object.DestroyImmediate(target);}
    }
}
