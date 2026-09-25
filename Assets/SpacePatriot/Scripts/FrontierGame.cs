using System;
using System.Collections;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using static SpacePatriot.IndustrialArt;

namespace SpacePatriot
{
    public partial class FrontierGame : MonoBehaviour
    {
        public static FrontierGame Instance;
        public SaveData save;
        public WorldInfo[] worlds;
        public CaseFile[] cases;
        public FrontierWorld world;
        public Camera view;
        public Transform ship,cabin,engines;
        Transform exterior;
        TextMesh velocityDisplay,serviceDisplay;
        Vector3 velocity,walkPosition;
        public bool flying,walking,cockpit,started,menu=true,dead;
        public string page="overview",toast="",reportTitle="",reportText="";
        public float speed,heat,shield=100,throttle,travelFade;
        float yaw,pitch,roll,walkYaw=0,walkPitch,toastTime,fireTime,hitTime,saveTime;
        bool docking,jumping;
        Place landingTarget;
        bool approachEntry;
        int selectedWorld=3,selectedCase,selectedShip;
        string targetedCase="water";
        AudioSource ambient,oneShot;
        AudioClip shotClip,buttonClip,impactClip;
        readonly List<Raider> raiders=new List<Raider>();
        readonly List<Bolt> bolts=new List<Bolt>();
        readonly List<Transform> debris=new List<Transform>();
        const string SaveKey="SpacePatriot.Unity.Frontier.v1";
        public ShipSpec Spec=>ShipSpec.Fleet[save.ship];
        public WorldInfo CurrentWorld=>worlds[save.world];
        public bool AtPort=>!flying&&!jumping;
        public float HullPercent=>save.hull/Spec.health*100;
        public bool HasSave=>PlayerPrefs.HasKey(SaveKey);

        class Raider { public Transform body;public float hp=70,shoot;public Vector3 velocity,home;public bool dead; }
        class Bolt { public Transform body; public Vector3 velocity;public float age;public bool enemy; }

        void Awake()
        {
            Instance=this;Application.targetFrameRate=Application.platform==RuntimePlatform.WebGLPlayer?-1:60;QualitySettings.vSyncCount=0;
            worlds=JsonUtility.FromJson<WorldCatalog>(Resources.Load<TextAsset>("Worlds").text).worlds;
            cases=JsonUtility.FromJson<CampaignCatalog>(Resources.Load<TextAsset>("Campaign").text).arcs;
            try{save=HasSave?JsonUtility.FromJson<SaveData>(PlayerPrefs.GetString(SaveKey)):new SaveData();}catch{save=new SaveData();}
            if(save==null||save.version!=1)save=new SaveData();save.world=Mathf.Clamp(save.world,0,worlds.Length-1);save.ship=Mathf.Clamp(save.ship,0,2);
            foreach(var c in cases)Progression.Get(save,c.id);
            world=new GameObject("Frontier environment").AddComponent<FrontierWorld>();world.Generate(CurrentWorld);
            var cameraObj=new GameObject("Flight camera");cameraObj.tag="MainCamera";view=cameraObj.AddComponent<Camera>();cameraObj.AddComponent<AudioListener>();
            view.nearClipPlane=.08f;view.farClipPlane=7000;view.fieldOfView=65;view.backgroundColor=new Color(.2f,.28f,.36f);view.clearFlags=CameraClearFlags.Skybox;view.allowHDR=true;
            view.gameObject.AddComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>().renderPostProcessing=true;
            RenderSettings.skybox=Resources.Load<Material>("Rendering/FrontierSky");
            RespawnShip();SetInitialCamera();MakeAudio();SpawnRaiders();
            var probe=new GameObject("Port reflection capture").AddComponent<ReflectionProbe>();probe.transform.position=new Vector3(0,world.Deck+7,0);probe.size=new Vector3(180,90,180);probe.resolution=128;probe.mode=UnityEngine.Rendering.ReflectionProbeMode.Realtime;probe.refreshMode=UnityEngine.Rendering.ReflectionProbeRefreshMode.ViaScripting;probe.RenderProbe();
            selectedShip=save.ship;selectedWorld=save.world==3?2:3;
        }
        void SetInitialCamera(){view.transform.position=ship.position+new Vector3(19,10,24);view.transform.LookAt(ship.position+Vector3.up);}
        void RespawnShip()
        {
            if(ship!=null)Destroy(ship.gameObject);
            var prefab=Resources.Load<GameObject>("Ships/"+Spec.name);
            if(prefab!=null){ship=Instantiate(prefab,transform).transform;cabin=ship.Find("Pressure cabin");engines=ship.Find("Drive plumes");}
            else ship=IndustrialArt.Ship(transform,save.ship,out cabin,out engines);
            exterior=ship.Find("Exterior hull");
            velocityDisplay=cabin.Find("Velocity readout").GetComponent<TextMesh>();serviceDisplay=cabin.Find("Service readout").GetComponent<TextMesh>();
            ship.position=new Vector3(0,world.Deck+2.65f,0);ship.rotation=Quaternion.identity;
            velocity=Vector3.zero;yaw=pitch=roll=0;throttle=0;speed=0;docking=false;flying=false;walking=false;
            save.hull=Mathf.Clamp(save.hull,1,Spec.health);
        }
        void StartGame()
        {
            started=true;menu=false;walking=true;walkPosition=new Vector3(-9,world.Deck+1.75f,-15);walkYaw=0;walkPitch=0;
            Toast("WASD to walk • Right mouse to look • E to use nearby equipment");Save();
        }
        public void Save()
        {PlayerPrefs.SetString(SaveKey,JsonUtility.ToJson(save));PlayerPrefs.Save();saveTime=Time.unscaledTime;}
        void OnApplicationPause(bool paused){if(paused&&save!=null)Save();}
        void OnApplicationQuit(){if(save!=null)Save();}
        public void Toast(string message){toast=message;toastTime=Time.unscaledTime+7;}
        static bool Down(Key k)=>Keyboard.current!=null&&Keyboard.current[k].wasPressedThisFrame;
        static bool Held(Key k)=>Keyboard.current!=null&&Keyboard.current[k].isPressed;
        static float Axis(Key negative,Key positive)=>(Held(positive)?1:0)-(Held(negative)?1:0);
        static bool MouseButton(int i)=>Mouse.current!=null&&(i==0?Mouse.current.leftButton.isPressed:Mouse.current.rightButton.isPressed);
        void Update()
        {
            float dt=Mathf.Min(Time.deltaTime,.04f);
            float fit=Mathf.Min(Screen.width/1440f,Screen.height/900f);float rw=1440*fit/Screen.width,rh=900*fit/Screen.height;view.rect=new Rect((1-rw)/2,(1-rh)/2,rw,rh);view.aspect=1.6f;
            world.Atmosphere(view,ship.position.y-world.Deck);
            if(Time.frameCount%8==0){velocityDisplay.text="VELOCITY\n"+speed.ToString("000")+" m/s";serviceDisplay.text="FUEL "+save.fuel.ToString("000")+"\nHULL "+HullPercent.ToString("000");}
            if(Down(Key.Escape))
            {
                if(reportText!=""){reportText="";reportTitle="";}else if(started){menu=!menu;page="overview";}
                Cursor.lockState=CursorLockMode.None;Cursor.visible=true;
            }
            if(!started){Showcase(dt);return;}
            if(!menu&&!dead&&reportText==""&&!jumping)
            {
                if(Down(Key.Tab)){menu=true;page="navigation";Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
                else if(walking)Walk(dt);else Flight(dt);
                if(Down(Key.C)&&!walking)cockpit=!cockpit;
                UpdateRaiders(dt);UpdateBolts(dt);
            }
            if(menu||reportText!=""||dead){Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
            heat=Mathf.MoveTowards(heat,0,dt*18);shield=Mathf.MoveTowards(shield,100,Time.time-hitTime>6?dt*7:0);
            engines.localScale=new Vector3(1,1,flying?Mathf.Lerp(1,3,throttle):1);
            ambient.volume=Mathf.Lerp(ambient.volume,PlayerPrefs.GetFloat("sp.volume",.55f)*(walking?.15f:flying?.3f:.1f),dt*4);
            ambient.pitch=Mathf.Lerp(ambient.pitch,flying?.65f+throttle*.45f:.5f,dt*3);
            if(Time.unscaledTime-saveTime>45)Save();
            FollowCamera(dt);
        }
        void Showcase(float dt)
        {
            float t=Time.time*.035f;view.transform.position=ship.position+new Vector3(13+Mathf.Sin(t)*1.5f,5.5f,17+Mathf.Cos(t)*1.5f);view.transform.LookAt(ship.position+new Vector3(-7,.4f,0));
        }
        void Walk(float dt)
        {
            if(MouseButton(1))
            {var delta=Mouse.current.delta.ReadValue();walkYaw+=delta.x*.12f;walkPitch=Mathf.Clamp(walkPitch-delta.y*.12f,-75,75);}
            walkYaw+=Axis(Key.LeftArrow,Key.RightArrow)*90*dt;walkPitch=Mathf.Clamp(walkPitch+Axis(Key.UpArrow,Key.DownArrow)*65*dt,-75,75);
            var move=Quaternion.Euler(0,walkYaw,0)*new Vector3(Axis(Key.A,Key.D),0,Axis(Key.S,Key.W));if(move.sqrMagnitude>1)move.Normalize();
            Vector3 next=walkPosition+move*(Held(Key.LeftShift)?8:4.5f)*dt;
            float ground=world.SurfaceAt(next);
            // Do not allow walking across a platform edge or through a wall.
            if(Mathf.Abs(ground-(walkPosition.y-1.75f))<1.2f&&!Physics.Raycast(walkPosition,move,out _,move.magnitude*.5f))
            {next.y=ground+1.75f;walkPosition=next;}
            if(Down(Key.E))Interact();
        }
        Place NearInteract()
        {
            Place best=null;float closest=float.MaxValue;
            foreach(var p in world.places){if(p.kind=="landing")continue;float d=Vector3.Distance(walkPosition,p.position+Vector3.up*1.75f);if(d<p.range&&d<closest){closest=d;best=p;}}
            return best;
        }
        void Interact()
        {
            var near=NearInteract();
            if(near!=null)
            {
                if(near.kind=="power"){page="reactor";menu=true;return;}
                Signal(near.kind);
                if(reportText==""){page=near.kind=="delivery"?"trade":"cases";menu=true;}
                return;
            }
            if(Vector3.Distance(walkPosition,ship.position)<13)
            {walking=false;cockpit=true;Toast("W/S throttle • A/D yaw • Arrows pitch/yaw • Q/E roll • Space brake • F launch • C camera");Sound(buttonClip,.3f);}
        }
        void Flight(float dt)
        {
            if(!flying)
            {
                if(Down(Key.E)){walking=true;walkPosition=ship.position+new Vector3(-8,-.9f,-3);walkYaw=0;walkPitch=0;return;}
                if(Down(Key.F)||Down(Key.W))
                {flying=true;ship.position+=Vector3.up*7;velocity=Vector3.up*4;throttle=.15f;Toast("Depart port. Hold W to increase throttle; Space brakes. L assists landing near a pad.");}
                return;
            }
            if(docking)
            {
                var approach=approachEntry?landingTarget.position+new Vector3(0,9,66):landingTarget.position;
                ship.position=Vector3.MoveTowards(ship.position,approach,dt*22);
                ship.rotation=Quaternion.Slerp(ship.rotation,Quaternion.identity,dt*2);velocity=Vector3.zero;speed=0;
                if(Vector3.Distance(ship.position,approach)<.05f){if(approachEntry)approachEntry=false;else Land(landingTarget);}
                return;
            }
            throttle=Mathf.Clamp01(throttle+Axis(Key.S,Key.W)*dt*.45f);
            bool brake=Held(Key.Space),boost=Held(Key.LeftShift)&&save.fuel>0&&heat<90;
            float inputYaw=Axis(Key.A,Key.D)+Axis(Key.LeftArrow,Key.RightArrow),inputPitch=Axis(Key.UpArrow,Key.DownArrow);
            if(MouseButton(1)){var delta=Mouse.current.delta.ReadValue();inputYaw+=Mathf.Clamp(delta.x*.045f,-1,1);inputPitch-=Mathf.Clamp(delta.y*.045f,-1,1);}
            yaw+=Mathf.Clamp(inputYaw,-1,1)*Spec.turn*.68f*dt;pitch=Mathf.Clamp(pitch+inputPitch*Spec.turn*.55f*dt,-75,75);
            roll=Mathf.Lerp(roll,-Mathf.Clamp(inputYaw,-1,1)*22+Axis(Key.Q,Key.E)*45,dt*3.5f);
            ship.rotation=Quaternion.Slerp(ship.rotation,Quaternion.Euler(pitch,yaw,roll),dt*5);
            if(brake)throttle=Mathf.MoveTowards(throttle,0,dt*.8f);
            float targetSpeed=throttle*Spec.speed*(boost?1.65f:1)*(save.fuel<=0?.35f:1);
            velocity=Vector3.MoveTowards(velocity,ship.forward*targetSpeed,Spec.thrust*(brake?2.8f:1)*dt);
            if(Held(Key.R))velocity+=Vector3.up*Spec.thrust*.8f*dt;if(Held(Key.F))velocity+=Vector3.down*Spec.thrust*.8f*dt;
            Vector3 proposed=ship.position+velocity*dt;
            var motion=proposed-ship.position;
            if(motion.magnitude>.001f&&Physics.Raycast(ship.position,motion.normalized,out var collision,motion.magnitude+2.2f))
            {
                if(velocity.magnitude>12)Damage((velocity.magnitude-10)*.7f);velocity=Vector3.Reflect(velocity,collision.normal)*.23f;throttle=0;
            }
            else ship.position=proposed;
            float floor=world.SurfaceAt(ship.position)+2.65f;
            if(ship.position.y<floor)
            {
                var pad=world.Nearest(ship.position,"landing");
                if(Vector3.Distance(ship.position,pad.position)<pad.range&&speed<14){Land(pad);return;}
                if(Mathf.Abs(velocity.y)>8)Damage(Mathf.Abs(velocity.y)*2);ship.position=new Vector3(ship.position.x,floor,ship.position.z);velocity.y=Mathf.Abs(velocity.y)*.25f;pitch=-8;
            }
            speed=velocity.magnitude;save.fuel=Mathf.Max(0,save.fuel-dt*(boost?.3f:.017f)*throttle);
            if(boost)heat=Mathf.Min(100,heat+dt*24);
            if(ship.position.y>6000){pitch=15;Toast("Local orbit limit. Select a world in Navigation to jump.");}
            if(ship.position.y<650&&new Vector2(ship.position.x,ship.position.z).magnitude>1450){yaw=Quaternion.LookRotation(-ship.position).eulerAngles.y;Toast("Leaving the local traffic volume. Navigation contains interplanetary routes.");}
            if(Down(Key.L))
            {
                var pad=world.Nearest(ship.position,"landing");float distance=Vector3.Distance(ship.position,pad.position);
                if(distance<140&&speed<45){landingTarget=pad;docking=true;approachEntry=pad.name=="Port 07 landing pad";Toast("Landing clearance received. Approach assist engaged.");}
                else Toast("For approach assist: within 140 m of a landing pad, below 45 m/s. Hold Space to brake.");
            }
            if((MouseButton(0)||Held(Key.LeftCtrl))&&Time.time>fireTime&&heat<88)Fire();
        }
        void Land(Place pad)
        {
            ship.position=pad.position;ship.rotation=Quaternion.identity;velocity=Vector3.zero;speed=0;throttle=0;pitch=yaw=roll=0;flying=false;docking=false;
            Save();Toast("Landing secured. E to leave the seat and walk the platform.");Sound(buttonClip,.4f);
        }
        void FollowCamera(float dt)
        {
            if(walking)
            {view.transform.position=walkPosition;view.transform.rotation=Quaternion.Euler(walkPitch,walkYaw,0);exterior.gameObject.SetActive(true);}
            else if(cockpit)
            {view.transform.position=ship.TransformPoint(new Vector3(0,1.58f,1.1f));view.transform.rotation=ship.rotation;exterior.gameObject.SetActive(false);}
            else
            {var target=ship.TransformPoint(new Vector3(0,5,-17));view.transform.position=Vector3.Lerp(view.transform.position,target,1-Mathf.Exp(-dt*5));view.transform.rotation=Quaternion.Slerp(view.transform.rotation,Quaternion.LookRotation(ship.position+ship.forward*22-view.transform.position),dt*7);exterior.gameObject.SetActive(true);}
            view.fieldOfView=Mathf.Lerp(view.fieldOfView,walking?68:speed>Spec.speed?76:65,dt*2);
        }
        void MakeAudio()
        {
            ambient=gameObject.AddComponent<AudioSource>();ambient.loop=true;ambient.spatialBlend=0;ambient.clip=Tone("Cabin machinery",100,2,.15f,true);ambient.Play();
            oneShot=gameObject.AddComponent<AudioSource>();oneShot.spatialBlend=0;
            shotClip=Tone("Coil discharge",400,.13f,.5f,false);buttonClip=Tone("Relay click",740,.055f,.2f,false);impactClip=Tone("Hull impact",75,.25f,.6f,true);
        }
        AudioClip Tone(string name,float hz,float duration,float gain,bool noise)
        {
            int n=(int)(22050*duration);var samples=new float[n];var random=new System.Random(41);
            for(int i=0;i<n;i++){float t=i/22050f;float envelope=name=="Cabin machinery"?1:Mathf.Pow(1-i/(float)n,2);samples[i]=((Mathf.Sin(t*hz*6.28318f)*.4f)+(noise?(float)(random.NextDouble()-.5)*.5f:Mathf.Sin(t*hz*12.56f)*.2f))*gain*envelope;}
            var clip=AudioClip.Create(name,n,1,22050,false);clip.SetData(samples,0);return clip;
        }
        void Sound(AudioClip clip,float volume){oneShot.PlayOneShot(clip,volume*PlayerPrefs.GetFloat("sp.volume",.55f));}
        public void Signal(string kind)
        {
            foreach(var c in cases)
            {
                if(Progression.CompleteStep(save,c,CurrentWorld.name,kind,out var report))
                {reportTitle=c.title;reportText=report;targetedCase=c.id;Save();Sound(buttonClip,.5f);return;}
            }
            if(kind=="delivery")Toast("Freight desk ready. Accept a matching case and bring the required cargo.");
            else if(kind=="sample")Toast("Survey sample logged. Accept the relevant case to use this evidence.");
        }
        public void BeginJump(int destination)
        {
            if(!flying){Toast("Board and launch before requesting a jump.");return;}
            if(speed>70){Toast("Reduce speed below 70 m/s before jump alignment.");return;}
            if(ship.position.y<world.Deck+65){Toast("Climb 65 m above the port before jump alignment. R engages vertical thrust.");return;}
            if(save.fuel<8){Toast("Jump requires 8 fuel. Return to port for fuel.");return;}
            if(destination==save.world){Toast("Already in this traffic sector.");return;}
            StartCoroutine(Jump(destination));
        }
        IEnumerator Jump(int destination)
        {
            jumping=true;menu=false;save.fuel-=8;Save();
            for(float t=0;t<1;t+=Time.unscaledDeltaTime){travelFade=t;yield return null;}
            ClearCombat();save.world=destination;world.Generate(CurrentWorld);ship.position=new Vector3(0,world.Deck+125,-180);ship.rotation=Quaternion.identity;pitch=yaw=roll=0;
            velocity=Vector3.forward*20;throttle=.2f;cockpit=false;SpawnRaiders();travelFade=1;Save();
            for(float t=1;t>0;t-=Time.unscaledDeltaTime){travelFade=t;yield return null;}
            travelFade=0;jumping=false;Toast("Arrived at "+CurrentWorld.name+". Port 07 is ahead. Brake and press L within 140 m to land.");
        }
        void SpawnRaiders()
        {
            for(int i=0;i<2;i++)
            {
                var body=Root("Unregistered interceptor",transform,new Vector3(420+i*100,180+i*40,520));
                var mat=Metal("Raider oxide",new Color(.37f,.23f,.18f));
                MeshObject("Narrow combat fuselage",body,HullMesh(new[]{-4f,0,4},new[]{1.8f,3,.3f},new[]{1f,1.6f,.3f},new[]{0f,0,0},"Raider hull"),mat,Vector3.zero,Vector3.one);
                for(int s=-1;s<=1;s+=2){Box("Blade wing",body,new Vector3(s*2,0,-1),new Vector3(3,.3f,3),Steel);Cylinder("Drive",body,new Vector3(s*2,0,-2.6f),.3f,.3f,IndustrialArt.Glow("Hostile drive",new Color(.9f,.38f,.1f),2),true);}
                raiders.Add(new Raider{body=body,home=body.position,shoot=Time.time+5+i});
            }
        }
        void ClearCombat(){foreach(var r in raiders)if(r.body)Destroy(r.body.gameObject);raiders.Clear();foreach(var b in bolts)if(b.body)Destroy(b.body.gameObject);bolts.Clear();}
        void UpdateRaiders(float dt)
        {
            foreach(var r in raiders)
            {
                if(r.dead)continue;
                float distance=Vector3.Distance(r.body.position,ship.position);
                bool engage=flying&&distance<480&&ship.position.y>world.Deck+50;
                Vector3 destination=engage?ship.position+velocity*1.2f:r.home+new Vector3(Mathf.Sin(Time.time*.13f)*110,Mathf.Sin(Time.time*.2f)*24,Mathf.Cos(Time.time*.13f)*110);
                if(engage&&distance<85)destination=r.body.position+r.body.forward*180+Vector3.up*45;
                var dir=(destination-r.body.position).normalized;r.body.rotation=Quaternion.RotateTowards(r.body.rotation,Quaternion.LookRotation(dir),dt*55);
                r.velocity=r.body.forward*(engage?42:25);r.body.position+=r.velocity*dt;
                if(engage&&Time.time>r.shoot&&Vector3.Dot(r.body.forward,(ship.position-r.body.position).normalized)>.93f)
                {r.shoot=Time.time+1.3f;SpawnBolt(r.body.position+r.body.forward*5,(ship.position+velocity*.35f-r.body.position).normalized*230,true);}
            }
        }
        void Fire()
        {
            fireTime=Time.time+(save.ship==1?.11f:.18f);heat+=save.ship==1?7:10;Sound(shotClip,.5f);
            Vector3 direction=ship.forward;float best=5;
            foreach(var r in raiders)
            {
                if(r.dead)continue;var delta=r.body.position-ship.position;float angle=Vector3.Angle(direction,delta);
                if(angle<best&&delta.magnitude<750){direction=(delta+r.velocity*(delta.magnitude/420)).normalized;best=angle;}
            }
            for(int side=-1;side<=1;side+=2)SpawnBolt(ship.position+ship.forward*7+ship.right*side*1.8f,direction*420+velocity,false);
        }
        void SpawnBolt(Vector3 p,Vector3 vel,bool enemy)
        {
            var body=Box("Coil tracer",transform,p,new Vector3(.1f,.1f,3.8f),enemy?Glow("Hostile tracer",new Color(1,.3f,.08f),3):Glow("Coil tracer",new Color(.75f,.89f,1),3)).transform;body.rotation=Quaternion.LookRotation(vel);
            bolts.Add(new Bolt{body=body,velocity=vel,enemy=enemy});
        }
        static float SegmentDistance(Vector3 p,Vector3 a,Vector3 b)
        {var v=b-a;float t=Mathf.Clamp01(Vector3.Dot(p-a,v)/Mathf.Max(.0001f,v.sqrMagnitude));return Vector3.Distance(p,a+t*v);}
        void UpdateBolts(float dt)
        {
            for(int i=bolts.Count-1;i>=0;i--)
            {
                var b=bolts[i];Vector3 from=b.body.position,to=from+b.velocity*dt;bool hit=false;b.age+=dt;
                if(b.enemy&&SegmentDistance(ship.position,from,to)<3.5f){Damage(8);hit=true;}
                if(!b.enemy)foreach(var r in raiders)
                {
                    if(r.dead||SegmentDistance(r.body.position,from,to)>4)continue;r.hp-=12;hit=true;Sound(impactClip,.25f);
                    if(r.hp<=0){r.dead=true;Burst(r.body.position);Destroy(r.body.gameObject);save.kills++;save.credits+=90;Signal("combat");Save();Toast("Hostile disabled. Salvage contract +90 cr.");}break;
                }
                if(Physics.Linecast(from,to))hit=true;
                b.body.position=to;if(hit||b.age>3){Destroy(b.body.gameObject);bolts.RemoveAt(i);}
            }
            for(int i=debris.Count-1;i>=0;i--){if(!debris[i]){debris.RemoveAt(i);continue;}debris[i].position+=debris[i].forward*dt*22;debris[i].Rotate(40*dt,65*dt,0);}
        }
        void Burst(Vector3 p)
        {for(int i=0;i<12;i++){var d=Box("Hull fragment",transform,p,Vector3.one*UnityEngine.Random.Range(.15f,.65f),i<3?Orange:Steel).transform;d.rotation=UnityEngine.Random.rotation;debris.Add(d);Destroy(d.gameObject,3);}}
        void Damage(float amount)
        {
            if(dead||amount<=0)return;hitTime=Time.time;float absorbed=Mathf.Min(shield,amount);shield-=absorbed;save.hull-=amount-absorbed;Sound(impactClip,.5f);
            if(save.hull<=0){save.hull=0;dead=true;menu=false;velocity=Vector3.zero;Save();}
        }
        void Rescue()
        {save.credits=Mathf.Max(0,save.credits-180);save.hull=Spec.health;save.fuel=Mathf.Max(save.fuel,35);shield=100;dead=false;ClearCombat();RespawnShip();SpawnRaiders();walking=true;walkPosition=new Vector3(-9,world.Deck+1.75f,-15);Save();Toast("Port recovery complete. Service fee: up to 180 cr.");}
    }
}
