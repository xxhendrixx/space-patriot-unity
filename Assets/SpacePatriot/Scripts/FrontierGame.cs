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
        public Spellworks effects;
        public Fireworks combustion;
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
        public bool AtPort {get {if(flying||jumping||ship==null||world==null)return false;var pad=world.Nearest(ship.position,"landing");return pad!=null&&Vector3.Distance(ship.position,pad.position)<pad.range+StandHeight;}}
        public float HullPercent=>save.hull/Spec.health*100;
        public bool HasSave=>!DesktopVerification.Active&&CampaignStorage.Exists;

        class Raider { public Transform body;public float hp=70,shoot;public Vector3 velocity,home;public bool dead; }
        class Bolt { public Transform body; public Vector3 velocity;public float age,damage=8,lifetime=3;public bool enemy,missile;public Raider target; }

        void Awake()
        {
            Instance=this;bindings=new FlightBindings();pilot=new PilotInput();Application.targetFrameRate=Application.platform==RuntimePlatform.WebGLPlayer?-1:60;QualitySettings.vSyncCount=0;
            worlds=JsonUtility.FromJson<WorldCatalog>(Resources.Load<TextAsset>("Worlds").text).worlds;
            cases=JsonUtility.FromJson<CampaignCatalog>(Resources.Load<TextAsset>("Campaign").text).arcs;
            try{save=DesktopVerification.Active?new SaveData():CampaignStorage.Load();}catch{save=new SaveData();}
            if(save==null||save.version<1)save=new SaveData();save.world=Mathf.Clamp(save.world,0,worlds.Length-1);if(save.version==1){save.ship=0;save.version=2;}save.ship=Mathf.Clamp(save.ship,0,99);save.ownedShips??=new List<int>{0};save.dockCargo??=new List<DockCargo>();save.vessel??=new VesselState();
            foreach(var c in cases)Progression.Get(save,c.id);
            FrontierEconomy.Ensure(save,worlds);
            LivingUniverse.Ensure(save,worlds);
            save.inventory??=new FieldInventoryState();
            if(save.ammo==null||save.ammo.Length!=5)save.ammo=System.Array.ConvertAll(WeaponSpec.All,w=>new WeaponAmmo(w.mag,w.reserve));
            effects=new GameObject("Spellworks / combat and survey effects").AddComponent<Spellworks>();effects.transform.SetParent(transform);
            combustion=new GameObject("Fireworks / causal combustion").AddComponent<Fireworks>();combustion.transform.SetParent(transform);
            world=new GameObject("Frontier environment").AddComponent<FrontierWorld>();world.Generate(CurrentWorld);
            var cameraObj=new GameObject("Flight camera");cameraObj.tag="MainCamera";view=cameraObj.AddComponent<Camera>();cameraObj.AddComponent<AudioListener>();
            view.nearClipPlane=.08f;view.farClipPlane=7000;view.fieldOfView=65;view.backgroundColor=new Color(.2f,.28f,.36f);view.clearFlags=CameraClearFlags.Skybox;view.allowHDR=true;
            view.gameObject.AddComponent<UnityEngine.Rendering.Universal.UniversalAdditionalCameraData>().renderPostProcessing=true;
            RenderSettings.skybox=Resources.Load<Material>("Rendering/FrontierSky");
            RespawnShip();SetInitialCamera();MakeAudio();SpawnRaiders();
            var probe=new GameObject("Port reflection capture").AddComponent<ReflectionProbe>();probe.transform.position=new Vector3(0,world.Deck+7,0);probe.size=new Vector3(180,90,180);probe.resolution=128;probe.mode=UnityEngine.Rendering.ReflectionProbeMode.Realtime;probe.refreshMode=UnityEngine.Rendering.ReflectionProbeRefreshMode.ViaScripting;probe.RenderProbe();
            selectedShip=save.ship;selectedWorld=save.world==3?2:3;
            if(!Application.isEditor&&Application.platform!=RuntimePlatform.WebGLPlayer&&!DesktopVerification.Active&&PlayerPrefs.GetInt("sp.fullscreen",0)==1)Screen.fullScreenMode=FullScreenMode.FullScreenWindow;
            if(DesktopVerification.Active)StartCoroutine(VerifyDesktopPlayer());
        }
        void SetInitialCamera(){view.transform.position=ship.position+new Vector3(19,10,24);view.transform.LookAt(ship.position+Vector3.up);}
        void RespawnShip()
        {
            if(ship!=null){ship.gameObject.SetActive(false);Destroy(ship.gameObject);}
            ship=new GameObject(Spec.name).transform;ship.SetParent(transform);
            var hullAsset=Resources.Load<GameObject>("OriginalShips/refit-"+Spec.family);
            if(hullAsset==null)throw new System.InvalidOperationException("Original fleet assets must be imported before entering the game.");
            exterior=Instantiate(hullAsset,ship).transform;exterior.name="Exterior hull";
            var basis=ShipSpec.Fleet[Spec.family*10];exterior.localScale=new Vector3(Spec.width/basis.width,Spec.height/basis.height,Spec.length/basis.length);
            cabin=Instantiate(Resources.Load<GameObject>("OriginalShips/cabin-"+Spec.family),ship).transform;
            cabin.name="Pressure cabin";PrepareDeck();cabin.localPosition=new Vector3(0,Spec.height*.23f,Spec.length*.18f);
            cabin.gameObject.AddComponent<CabinLighting>().Configure(activeDeck);
            engines=new GameObject("Drive plumes").transform;engines.SetParent(ship,false);
            var model=ship.gameObject.AddComponent<OriginalShip>();model.eye=cabin.localPosition;model.exterior=exterior;model.cabin=cabin;
            var gearParts=new List<Transform>();foreach(var t in exterior.GetComponentsInChildren<Transform>())if(t.name=="Landing gear")gearParts.Add(t);model.gear=gearParts.ToArray();
            foreach(var control in cabin.GetComponentsInChildren<CockpitControl>())control.gameObject.layer=2;
            velocityDisplay=Label(cabin,"VELOCITY",new Vector3(-1.02f,-.87f,1.46f),.0018f,new Color(.75f,.84f,.52f));
            serviceDisplay=Label(cabin,"SYSTEMS",new Vector3(1.02f,-.87f,1.46f),.0018f,new Color(.75f,.84f,.52f));
            navigationDisplay=Label(cabin,"NAVIGATION",new Vector3(0,-.89f,1.44f),.002f,new Color(.75f,.84f,.52f));
            velocityDisplay.gameObject.SetActive(false);serviceDisplay.gameObject.SetActive(false);navigationDisplay.gameObject.SetActive(false);SetupMfd();
            foreach(var r in exterior.GetComponentsInChildren<MeshRenderer>())if(r.sharedMaterial.name=="Hull finish"){var material=r.material;material.SetColor("_BaseColor",Color.Lerp(Spec.paint,new Color(.14f,.17f,.19f),.45f));}
            var spawn=Spec.length>60?new Vector3(650,0,230):Vector3.zero;
            spawn.y=(Spec.length<=60&&world.lift!=null?world.Deck+world.lift.DeckOffset:world.SurfaceAt(spawn))+StandHeight;ship.position=spawn;ship.rotation=Quaternion.identity;
            velocity=Vector3.zero;angularVelocity=Vector3.zero;yaw=pitch=roll=0;throttle=1;speed=0;docking=false;flying=false;walking=false;aboard=false;
            gearDown=true;flightAssist=true;powered=true;cruise=false;cargoDoor=false;inputNeutral=true;launchPending=false;launchClearance=0;systemsHull=save.hull;
            save.hull=Mathf.Clamp(save.hull,1,Spec.health);RebuildCargo();
        }
        void StartGame()
        {
            started=true;menu=false;walking=true;walkPosition=ship.position+new Vector3(-Spec.width*.65f,1.75f-StandHeight,-3);walkYaw=0;walkPitch=0;
            Toast("WASD to walk • Right mouse to look • F to board • E to use equipment • Cargo handling at the freight terminal");Save();
        }
        public void Save()
        {
            if(DesktopVerification.Active)return;
            try{if(save.society!=null)save.society.savedUtc=DateTimeOffset.UtcNow.ToUnixTimeSeconds();CampaignStorage.Write(save);PlayerPrefs.Save();saveTime=Time.unscaledTime;}
            catch(Exception e) when(e is System.IO.IOException||e is UnauthorizedAccessException){Debug.LogError("Unable to save campaign: "+e.Message);Toast("Could not write the save file. Check available disk space.");saveTime=Time.unscaledTime;}
        }
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
            if(Down(Key.F11))ToggleDesktopFullscreen();
            float fit=Mathf.Min(Screen.width/1440f,Screen.height/900f);float rw=1440*fit/Screen.width,rh=900*fit/Screen.height;view.rect=new Rect((1-rw)/2,(1-rh)/2,rw,rh);view.aspect=1.6f;
            world.Atmosphere(view,ship.position.y-world.Deck);
            if(Time.frameCount%8==0)UpdateInstruments();
            if(Down(Key.Escape)||Gamepad.current?.startButton.wasPressedThisFrame==true)
            {
                if(reportText!=""){reportText="";reportTitle="";}else if(started){menu=!menu;page="overview";}
                Cursor.lockState=CursorLockMode.None;Cursor.visible=true;
            }
            if(!started){Showcase(dt);return;}
            if(!menu&&!dead&&reportText==""&&!jumping)
            {
                UpdateWeapons(dt);
                if(Down(Key.Tab)||Down(Key.M)){menu=true;page="navigation";Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
                else if(walking&&Down(Key.O)){menu=true;page="hangar";}
                else if(walking)Walk(dt);else if(aboard)WalkDeck(dt);else Flight(dt);
                if(bindings.Down("Camera")&&!walking)cockpit=!cockpit;
                if(bindings.Down("Shipyard")){menu=true;page="hangar";}
                UpdateRaiders(dt);UpdateBolts(dt);
            }
            if(menu||reportText!=""||dead){inputNeutral=true;Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
            TickVessel(dt);
            TickEconomy(dt);
            TickSociety(dt);
            TickCargo(dt);
            ambient.volume=Mathf.Lerp(ambient.volume,PlayerPrefs.GetFloat("sp.volume",.55f)*(walking?.15f:flying?.3f:.1f),dt*4);
            ambient.pitch=Mathf.Lerp(ambient.pitch,flying?.65f+throttle*.45f:.5f,dt*3);
            if(Time.unscaledTime-saveTime>45)Save();
            FollowCamera(dt);
        }
        void Showcase(float dt)
        {
            cabin.gameObject.SetActive(false);
            float t=Time.time*.035f;view.transform.position=ship.position+new Vector3(Spec.width*.9f+Mathf.Sin(t)*2,Spec.height*1.3f,Spec.length*.8f+Mathf.Cos(t)*2);view.transform.LookAt(ship.position);
        }
        void Walk(float dt)
        {
            if(MouseButton(1))
            {var delta=Mouse.current.delta.ReadValue()*PlayerPrefs.GetFloat("sp.sensitivity",1);walkYaw+=delta.x*.12f;walkPitch=Mathf.Clamp(walkPitch+delta.y*.12f*(PlayerPrefs.GetInt("sp.invert",0)==1?1:-1),-75,75);}
            walkYaw+=Axis(Key.LeftArrow,Key.RightArrow)*90*dt;walkPitch=Mathf.Clamp(walkPitch+Axis(Key.UpArrow,Key.DownArrow)*65*dt,-75,75);
            var pad=Gamepad.current;var stick=pad?.leftStick.ReadValue()??Vector2.zero;var look=pad?.rightStick.ReadValue()??Vector2.zero;
            walkYaw+=look.x*110*dt;walkPitch=Mathf.Clamp(walkPitch+look.y*90*dt*(PlayerPrefs.GetInt("sp.padInvert",0)==1?1:-1),-75,75);
            var move=Quaternion.Euler(0,walkYaw,0)*new Vector3(bindings.Axis("Strafe left","Strafe right")+stick.x,0,bindings.Axis("Reverse","Forward")+stick.y);if(move.sqrMagnitude>1)move.Normalize();
            Vector3 next=walkPosition+move*(Held(Key.LeftShift)?8:4.5f)*dt;
            float ground=world.SurfaceAt(next);
            // Do not allow walking across a platform edge or through a wall.
            if(Mathf.Abs(ground-(walkPosition.y-1.75f))<1.2f&&!Physics.Raycast(walkPosition,move,out _,move.magnitude*.5f))
            {next.y=ground+1.75f;walkPosition=next;}
            if(Down(Key.E)||Down(Key.Z)||pad?.buttonEast.wasPressedThisFrame==true)Interact();
            if(bindings.Down("Board / leave seat")||Down(Key.J))BoardOrExit();
            if(Down(Key.B)){if(Held(Key.LeftShift))CollectFieldSample();else {Signal("scan");Toast("Survey scan complete. Shift+B collects a sample near the field station.");}}
        }
        Place NearInteract()
        {
            Place best=null;float closest=float.MaxValue;
            foreach(var p in world.places){if(p.kind=="landing")continue;float d=Vector3.Distance(walkPosition,p.position+Vector3.up*1.75f);if(d<p.range&&d<closest){closest=d;best=p;}}
            return best;
        }
        void Interact()
        {
            if(SpeakToResident())return;
            if(Vector3.Distance(walkPosition,new Vector3(49,world.Deck+1.75f,26))<4){menu=true;page="inventory";return;}
            var elevator=world.NearbyLift(walkPosition);if(elevator!=null){elevator.RequestNext();return;}
            if(AtCargoAccess){menu=true;page="cargo";return;}
            var near=NearInteract();
            if(near!=null)
            {
                if(near.kind.StartsWith("city-")){CityInteraction(int.Parse(near.kind.Substring(5)));return;}
                if(near.kind=="power"){page="reactor";menu=true;return;}
                Signal(near.kind);
                if(reportText==""){page=near.kind=="delivery"?"trade":"cases";menu=true;}
                return;
            }
            if(Vector3.Distance(walkPosition,ship.position)<Spec.width*.7f+5)BoardOrExit();
        }
        void Land(Place pad)
        {
            ship.position=pad.position+Vector3.up*(StandHeight-2.65f);ship.rotation=Quaternion.identity;velocity=Vector3.zero;speed=0;throttle=Mathf.Clamp(throttle,.05f,3);pitch=yaw=roll=0;flying=false;docking=false;launchClearance=0;
            Save();Toast("Landing secured. F to leave the seat. Cargo hatch and loading are available while landed.");Sound(buttonClip,.4f);
        }
        void FollowCamera(float dt)
        {
            cabin.gameObject.SetActive(aboard||!walking&&cockpit);
            if(aboard){view.transform.position=cabin.TransformPoint(deckPosition);view.transform.rotation=ship.rotation*Quaternion.Euler(walkPitch,walkYaw,0);exterior.gameObject.SetActive(false);}
            else if(walking)
            {view.transform.position=walkPosition;view.transform.rotation=Quaternion.Euler(walkPitch,walkYaw,0);exterior.gameObject.SetActive(true);}
            else if(cockpit)
            {view.transform.position=cabin.position;view.transform.rotation=ship.rotation;exterior.gameObject.SetActive(false);}
            else
            {var target=ship.TransformPoint(new Vector3(0,Spec.height*.8f,-Spec.length*.95f));view.transform.position=Vector3.Lerp(view.transform.position,target,1-Mathf.Exp(-dt*5));view.transform.rotation=Quaternion.Slerp(view.transform.rotation,Quaternion.LookRotation(ship.position+ship.forward*22-view.transform.position),dt*7);exterior.gameObject.SetActive(true);}
            view.fieldOfView=Mathf.Lerp(view.fieldOfView,walking||aboard?68:cockpit?58.7f:speed>Spec.speed?76:65,dt*2);
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
            if(kind=="sample"||kind=="scan")effects.Survey(walking?walkPosition:ship.position);
            foreach(var c in cases)
            {
                if(Progression.CompleteStep(save,c,CurrentWorld.name,kind,out var report))
                {reportTitle=c.title;reportText=report;targetedCase=c.id;RebuildCargo();Save();Sound(buttonClip,.5f);return;}
            }
            if(kind=="delivery")Toast("Freight desk ready. Accept a matching case and bring the required cargo.");
            else if(kind=="sample")Toast("Survey sample logged. Accept the relevant case to use this evidence.");
        }
        public void BeginJump(int destination)
        {
            if(!flying){Toast("Board and launch before requesting a jump.");return;}
            if(gearDown||!powered||cargoDoor){Toast("Retract landing gear, close the cargo hatch and power the engine bus before jumping.");return;}
            if(speed>70){Toast("Reduce speed below 70 m/s before jump alignment.");return;}
            if(ship.position.y<world.Deck+65){Toast("Climb 65 m above the port before jump alignment. Space engages vertical thrust.");return;}
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
            travelFade=0;jumping=false;Toast("Arrived at "+CurrentWorld.name+". Port 07 is ahead. Press X to brake, extend gear with G, then L to land.");
        }
        void SpawnRaiders()
        {
            for(int i=0;i<2;i++)
            {
                var body=Root("Unregistered interceptor",transform,new Vector3(420+i*100,180+i*40,520));
                var hull=Instantiate(Resources.Load<GameObject>("OriginalShips/refit-1"),body).transform;hull.localPosition=Vector3.zero;
                raiders.Add(new Raider{body=body,home=body.position,shoot=Time.time+5+i});
            }
        }
        void ClearCombat(){selectedTarget=null;foreach(var r in raiders)if(r.body)Destroy(r.body.gameObject);raiders.Clear();foreach(var b in bolts)if(b.body)Destroy(b.body.gameObject);bolts.Clear();}
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
        void SpawnBolt(Vector3 p,Vector3 vel,bool enemy,WeaponSpec spec=null)
        {
            bool missile=spec?.id=="missile";
            var body=Box(missile?"IR seeker":"Kinetic tracer",transform,p,missile?new Vector3(.23f,.23f,1.7f):new Vector3(.06f,.06f,1.8f),enemy?Glow("Hostile tracer",new Color(1,.3f,.08f),3):Glow("Kinetic tracer",new Color(1,.79f,.4f),3)).transform;body.rotation=Quaternion.LookRotation(vel);
            if(missile){var trail=body.gameObject.AddComponent<TrailRenderer>();trail.sharedMaterial=Glow("Missile plume",new Color(1,.22f,.045f),2);trail.time=.3f;trail.startWidth=.19f;trail.endWidth=0;}
            bolts.Add(new Bolt{body=body,velocity=vel,enemy=enemy,damage=spec?.damage??8,lifetime=spec==null?4:spec.range/Mathf.Max(1,spec.speed),missile=missile,target=missile?selectedTarget:null});
        }
        static float SegmentDistance(Vector3 p,Vector3 a,Vector3 b)
        {var v=b-a;float t=Mathf.Clamp01(Vector3.Dot(p-a,v)/Mathf.Max(.0001f,v.sqrMagnitude));return Vector3.Distance(p,a+t*v);}
        void UpdateBolts(float dt)
        {
            for(int i=bolts.Count-1;i>=0;i--)
            {
                var b=bolts[i];
                if(b.missile&&b.target!=null&&!b.target.dead&&b.target.body!=null){var desired=(b.target.body.position+b.target.velocity*.25f-b.body.position).normalized;float v=Mathf.MoveTowards(b.velocity.magnitude,640,dt*120);b.velocity=Vector3.RotateTowards(b.velocity.normalized,desired,dt*1.65f,0)*v;b.body.rotation=Quaternion.LookRotation(b.velocity);}
                Vector3 from=b.body.position,to=from+b.velocity*dt;bool hit=false;b.age+=dt;float nearest=1;
                if(Physics.Linecast(from,to,out var environment,Physics.DefaultRaycastLayers,QueryTriggerInteraction.Ignore)){nearest=Vector3.Distance(from,environment.point)/Mathf.Max(.001f,Vector3.Distance(from,to));hit=true;}
                Raider victim=null;
                if(b.enemy){var t=SegmentHit(from,to,walking?walkPosition-Vector3.up*.7f:ship.position,walking?.6f:Spec.width*.22f);if(t.HasValue&&t.Value<=nearest){Damage(b.damage);nearest=t.Value;hit=true;}}
                else foreach(var r in raiders){if(r.dead)continue;var t=SegmentHit(from,to,r.body.position,4);if(t.HasValue&&t.Value<=nearest){victim=r;nearest=t.Value;hit=true;}}
                if(victim!=null)HitRaider(victim,b.damage);
                b.body.position=Vector3.Lerp(from,to,nearest);if(hit||b.age>b.lifetime){if(hit){if(b.missile)Burst(b.body.position);else effects.Impact(b.body.position,-b.velocity.normalized);}Destroy(b.body.gameObject);bolts.RemoveAt(i);}

            }
            for(int i=debris.Count-1;i>=0;i--){if(!debris[i]){debris.RemoveAt(i);continue;}debris[i].position+=debris[i].forward*dt*22;debris[i].Rotate(40*dt,65*dt,0);}
        }
        void Burst(Vector3 p)
        {effects.Impact(p,Vector3.up,true,3);if(CurrentWorld.biome=="temperate"&&p.y<world.Height(p.x,p.z)+14)combustion.Ignite(new Vector3(p.x,world.Height(p.x,p.z)+.2f,p.z),8,1.4f);for(int i=0;i<12;i++){var d=Box("Hull fragment",transform,p,Vector3.one*UnityEngine.Random.Range(.15f,.65f),i<3?Orange:Steel).transform;d.rotation=UnityEngine.Random.rotation;debris.Add(d);Destroy(d.gameObject,3);}}
        void Damage(float amount)
        {
            if(dead||amount<=0)return;if(walking||aboard){save.crewHealth=Mathf.Max(0,save.crewHealth-amount);if(save.crewHealth==0){dead=true;menu=false;Save();}return;}hitTime=Time.time;float absorbed=Mathf.Min(shield,amount);shield-=absorbed;save.hull-=amount-absorbed;Sound(impactClip,.5f);
            if(save.hull<=0){save.hull=0;dead=true;menu=false;velocity=Vector3.zero;Save();}
        }
        void Rescue()
        {save.credits=Mathf.Max(0,save.credits-180);save.hull=Spec.health;save.crewHealth=100;save.fuel=Mathf.Max(save.fuel,35);shield=100;dead=false;ClearCombat();RespawnShip();SpawnRaiders();walking=true;walkPosition=ship.position+new Vector3(-Spec.width*.65f,1.75f-StandHeight,-3);Save();Toast("Port recovery complete. Service fee: up to 180 cr.");}
    }
}

