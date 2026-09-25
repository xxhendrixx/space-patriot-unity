using UnityEngine;
using UnityEngine.InputSystem;

namespace SpacePatriot
{
    public partial class FrontierGame
    {
        FlightBindings bindings;
        PilotInput pilot;
        public bool powered=true,flightAssist=true,gearDown=true,lightsOn=true,instruments,cruise,armed;
        public bool aboard;
        bool inputNeutral=true,focused=true;
        Vector3 angularVelocity,deckPosition;
        TextMesh navigationDisplay;
        float lastForward=-10,tacticalUntil,tacticalReady;
        bool launchPending;
        float launchClearance;
        public float StandHeight=>Spec.height*.3f+2;
        public float LoadedMass=>Spec.mass+save.organics*.5f+save.ore*1.5f+save.crystal*.8f;
        public float EngineAcceleration=>Spec.thrust*Spec.mass/LoadedMass*save.vessel.Factor("engines",powered);
        void OnApplicationFocus(bool value){focused=value;inputNeutral=true;angularVelocity=Vector3.zero;if(!value){Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}}
        void BoardOrExit()
        {
            inputNeutral=true;instruments=false;Cursor.lockState=CursorLockMode.None;Cursor.visible=true;
            if(walking){if(Vector3.Distance(walkPosition,ship.position)>Spec.width*.7f+8){Toast("Move alongside your ship to board.");return;}
                walking=false;aboard=false;cockpit=true;Toast("Space launches • WASD translates • Arrows / mouse steer • Q/E roll • X brakes • G gear • V camera");return;}
            if(activeDeck!=null){aboard=!aboard;deckLevel=0;deckLiftMoving=false;if(deckLiftPlatform)deckLiftPlatform.localPosition=new Vector3(0,-1.7f,-5);deckPosition=new Vector3(0,0,-1.8f);walkYaw=walkPitch=0;cockpit=true;Toast(aboard?"Walk the deck. F returns to the helm; use the airlock to disembark.":"Pilot station occupied.");return;}
            if(flying){Toast("Land before opening the airlock.");return;}
            walking=true;walkPosition=ship.position+ship.right*(Spec.width*.6f+2);walkPosition.y=world.SurfaceAt(walkPosition)+1.75f;walkYaw=ship.eulerAngles.y;walkPitch=0;cockpit=false;
        }
        bool NeutralControls()
        {
            return pilot.Neutral&&!MouseButton(0);
        }
        void Flight(float dt)
        {
            if(!focused)return;
            if(bindings.Down("Board / leave seat")){BoardOrExit();return;}
            if(pilot.Down("Interact")){if(flying)RequestLanding();else Launch();return;}
            if(bindings.Down("Instruments")||Down(Key.I)){instruments=!instruments;inputNeutral=true;Cursor.lockState=instruments?CursorLockMode.None:CursorLockMode.Locked;Cursor.visible=instruments;}
            if(bindings.Down("Gear"))ActivateCockpit(2);
            if(bindings.Down("Power"))ActivateCockpit(0);
            if(bindings.Down("Assist"))ActivateCockpit(1);
            if(bindings.Down("Lights"))ActivateCockpit(3);
            if(bindings.Down("Cruise"))ActivateCockpit(5);
            
            if(bindings.Down("Horizon")){var forward=Vector3.ProjectOnPlane(ship.forward,Vector3.up);if(forward.sqrMagnitude>.01f)ship.rotation=Quaternion.LookRotation(forward,Vector3.up);angularVelocity=Vector3.zero;}
            if(bindings.Down("Jump"))BeginJump(selectedWorld);
            if(pilot.Down("Camera"))cockpit=!cockpit;
            if(pilot.Down("Assist"))ActivateCockpit(1);
            if(pilot.Down("Arm"))armed=!armed;
            if(pilot.Down("Gear"))ActivateCockpit(2);
            if(instruments){Cursor.lockState=CursorLockMode.None;Cursor.visible=true;}
            if(cockpit&&Cursor.lockState!=CursorLockMode.Locked&&!MouseButton(1))PointCockpit();else cockpitHint="";
            // Menu/focus recovery suppresses carried-over analog input, never keyboard thrust or simulation.
            if(inputNeutral&&NeutralControls())inputNeutral=false;
            bool analogReady=!inputNeutral;
            if(!flying)
            {
                if(launchPending&&(world.lift==null||world.lift.Ready)){launchPending=false;Launch();return;}
                if(bindings.Held("Ascend")||bindings.Down("Ascend")||bindings.Down("Landing")||pilot.Down("Ascend"))Launch();
                return;
            }
            if(bindings.Held("Brake")){cruise=false;docking=false;tacticalUntil=0;}
            if(docking)
            {
                var target=landingTarget.position+Vector3.up*(StandHeight-2.65f);
                var approach=approachEntry?target+new Vector3(0,9,66):target;
                ship.position=Vector3.MoveTowards(ship.position,approach,dt*Mathf.Max(5,Spec.thrust));
                ship.rotation=Quaternion.Slerp(ship.rotation,Quaternion.identity,dt*2);velocity=Vector3.zero;speed=0;
                if(Vector3.Distance(ship.position,approach)<.05f){if(approachEntry)approachEntry=false;else Land(landingTarget);}return;
            }
            if(bindings.Down("Forward")){if(Time.time-lastForward<.32f)TacticalBoost();lastForward=Time.time;}
            if(Mouse.current!=null&&!instruments&&cockpitHint=="")throttle=Mathf.Clamp(throttle*Mathf.Exp(Mouse.current.scroll.ReadValue().y*.0013f),.05f,3);
            Vector3 translation=new Vector3(bindings.Axis("Strafe left","Strafe right"),bindings.Axis("Descend","Ascend"),bindings.Axis("Reverse","Forward"));
            Vector3 rates=new Vector3(bindings.Axis("Pitch up","Pitch down"),bindings.Axis("Yaw left","Yaw right"),-bindings.Axis("Roll left","Roll right"));
            rates.z-=Axis(Key.LeftBracket,Key.RightBracket);
            bool brake=bindings.Held("Brake"),boost=bindings.Held("Boost");
            if(launchClearance>0){if(brake||translation.y<0||ship.position.y>=launchClearance)launchClearance=0;else translation.y=Mathf.Max(translation.y,.55f);}
            if(analogReady){translation+=pilot.Translation;rates+=pilot.Rotation;brake|=pilot.Held("Brake");boost|=pilot.Held("Boost");}
            Vector3 mouseDegrees=Vector3.zero;
            if(instruments){translation=launchClearance>0?Vector3.up*.55f:Vector3.zero;rates=Vector3.zero;boost=false;}
            else if(analogReady&&Mouse.current!=null&&(MouseButton(1)||Cursor.lockState==CursorLockMode.Locked))
            {var delta=Vector2.ClampMagnitude(Mouse.current.delta.ReadValue(),180)*PlayerPrefs.GetFloat("sp.sensitivity",1);mouseDegrees=new Vector3(delta.y*(PlayerPrefs.GetInt("sp.invert",0)==1?1:-1),delta.x,0)*.12f;}
            boost=boost&&save.fuel>0&&heat<90;
            if(brake)cruise=false;
            if(cruise&&translation.z>=0)translation.z=1;
            float turnLimit=Spec.turn*(gearDown?.6f:1);
            angularVelocity=Vector3.MoveTowards(angularVelocity,Vector3.ClampMagnitude(rates,1.5f)*turnLimit,turnLimit*5*dt);
            if(powered){ship.rotation=FlightMotor.Rotate(ship.rotation,angularVelocity,dt);ship.rotation=FlightMotor.Rotate(ship.rotation,mouseDegrees,1);}
            float acceleration=EngineAcceleration*(Time.time<tacticalUntil?4:boost?3:1);
            float limit=Spec.speed*throttle*(gearDown?.35f:1)*(boost?2.65f:1)*(cruise?4:1);
            velocity=FlightMotor.Step(velocity,ship.rotation,translation,limit,acceleration,dt,flightAssist,brake,powered&&save.fuel>0);
            Vector3 motion=velocity*dt;
            if(motion.sqrMagnitude>.000001f&&Physics.SphereCast(ship.position,Mathf.Max(1,Spec.width*.1f),motion.normalized,out var hit,motion.magnitude,Physics.DefaultRaycastLayers,QueryTriggerInteraction.Ignore))
            {if(velocity.magnitude>12)Damage((velocity.magnitude-10)*.7f);velocity=Vector3.Reflect(velocity,hit.normal)*.15f;cruise=false;}
            else ship.position+=motion;
            float floor=world.SurfaceAt(ship.position)+StandHeight;
            if(ship.position.y<floor){if(gearDown&&velocity.magnitude<12&&Vector3.Dot(ship.up,Vector3.up)>.88f){var landing=world.Nearest(ship.position,"landing");if(Vector3.Distance(ship.position,landing.position)<landing.range+StandHeight){Land(landing);return;}
                    flying=false;velocity=Vector3.zero;ship.position=new Vector3(ship.position.x,floor,ship.position.z);Save();Toast("Surface landing secured.");}
                else{Damage(Mathf.Max(0,Mathf.Abs(velocity.y)-4)*2);ship.position=new Vector3(ship.position.x,floor,ship.position.z);velocity.y=Mathf.Abs(velocity.y)*.15f;}}
            speed=velocity.magnitude;
            float load=translation.magnitude+(brake?1:0);if(powered)save.fuel=Mathf.Max(0,save.fuel-dt*(boost?.12f:.012f)*load);
            if(boost)heat=Mathf.Min(100,heat+dt*24);
            if(bindings.Down("Landing"))RequestLanding();
            if(analogReady&&armed&&!instruments&&cockpitHint==""&&(MouseButton(0)||pilot.Held("Fire"))&&Time.time>fireTime&&heat<88&&save.vessel.Factor("weapons",powered)>.05f)Fire();
        }
        void Launch()
        {
            if(!powered||save.fuel<=0){Toast("Start the engine bus and refuel before launching.");return;}
            if(cargoDoor||cargoTransfer!=null){Toast("Finish cargo handling and close the cargo hatch before launch.");return;}
            if(Mathf.Abs(ship.position.x)<65&&Mathf.Abs(ship.position.z)<110&&world.lift!=null&&!world.lift.Ready){world.lift.Raise();launchPending=true;Toast("Hangar lift raising. Roof opening; flight control transfers after clearance.");return;}
            // A tap starts an actual clearance climb; releasing Space while the lift
            // moves must not immediately drop the ship back onto the platform.
            launchPending=false;launchClearance=ship.position.y+14;flying=true;velocity=Vector3.up*5;ship.position+=Vector3.up*1.5f;inputNeutral=!pilot.Neutral;Toast("Launch climb engaged. WASD and Space/Ctrl thrust; arrows steer; G gear; X brake.");
        }
        void RequestLanding()
        {
            if(!flying){Launch();return;}if(!gearDown){Toast("Extend the gear with G before landing.");return;}
            var pad=world.Nearest(ship.position,"landing");float distance=Vector3.Distance(ship.position,pad.position);
            if(distance<Mathf.Max(140,Spec.length)&&speed<45){landingTarget=pad;docking=true;approachEntry=Spec.length<60&&pad.name=="Port 07 landing pad";Toast("Approach assist engaged. X cancels.");}
            else Toast("Approach the pad below 45 m/s. X applies braking thrust.");
        }
        void TacticalBoost(){if(Time.time<tacticalReady||!powered||gearDown)return;tacticalUntil=Time.time+2;tacticalReady=Time.time+8;Toast("Tactical thrust engaged.");}
        void ActivateCockpit(int action)
        {
            switch(action){case 0:powered=!powered;if(!powered){cruise=false;flightAssist=false;}break;
                case 1:if(powered)flightAssist=!flightAssist;break;
                case 2:if(flying&&!cargoDoor)gearDown=!gearDown;else Toast("Landing gear is locked while parked or handling cargo.");ship.GetComponent<OriginalShip>().SetGear(gearDown);break;
                case 3:lightsOn=!lightsOn;break;case 4:TacticalBoost();break;
                case 5:if(flying&&powered&&!gearDown){cruise=!cruise;armed=false;}else Toast("Cruise requires flight, power and retracted gear.");break;
                case 6:case 10:menu=true;page="navigation";break;case 7:BeginJump(selectedWorld);break;case 8:RequestLanding();break;
                case 9:Toast("Local contacts scanned. Surface samples require an on-foot collection near the survey site.");break;case 11:cockpit=!cockpit;break;}
        }
        void ClickCockpit()
        {
            if(!cockpit)return;var ray=view.ScreenPointToRay(Mouse.current.position.ReadValue());
            if(Physics.Raycast(ray,out var hit,8,1<<2)&&hit.collider.TryGetComponent<CockpitControl>(out var button))
            {if(button.action>=0)ActivateCockpit(button.action);else {menu=true;page=button.screen==0?"systems":button.screen==1?"navigation":"cargo";}}
        }
        void UpdateInstruments()
        {
            UpdateMfd();
            velocityDisplay.text="SCM / "+(flightAssist?"IFCS":"DECOUPLED")+"\n"+speed.ToString("000")+" m/s\nLIMIT "+(throttle*100).ToString("0")+"%\nGEAR "+(gearDown?"DOWN":"UP");
            serviceDisplay.text=(powered?"BUS ONLINE":"BUS OFFLINE")+"\nFUEL "+save.fuel.ToString("000")+"\nHULL "+HullPercent.ToString("000")+"\nHOLD "+Progression.Used(save)+" / "+Spec.capacity;
            navigationDisplay.text=CurrentWorld.name.ToUpperInvariant()+"\n"+(flying?"ALT "+Mathf.Max(0,ship.position.y-world.SurfaceAt(ship.position)-StandHeight).ToString("0"):"LANDED")+"\n"+(cruise?"CRUISE":armed?"WEAPONS ARMED":"WEAPONS SAFE")+"\nZ  INSTRUMENTS";
        }
    }
}

