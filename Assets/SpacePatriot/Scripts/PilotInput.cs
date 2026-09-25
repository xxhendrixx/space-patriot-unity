using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;
using UnityEngine.InputSystem.Controls;

namespace SpacePatriot
{
    [Serializable] public class PilotAxis
    {
        public string action, device="auto", path="";
        public float center, deadzone=.16f, sensitivity=1;
        public bool inverted;
    }
    [Serializable] public class PilotButton
    {
        public string action, device="auto", path="";
    }
    [Serializable] public class PilotConfiguration
    {
        public bool enabled=true;
        public List<PilotAxis> axes=new List<PilotAxis>();
        public List<PilotButton> buttons=new List<PilotButton>();
    }

    // Bind to a device identity, not Joystick.current (which changes whenever
    // either stick moves). Paths are learned from the actual connected report.
    public sealed class PilotInput
    {
        const string Preference="sp.pilot-input.v1";
        public static readonly string[] AxisNames={"Strafe","Lift","Forward","Pitch","Yaw","Roll"};
        public static readonly string[] ButtonNames={"Boost","Interact","Reload","Target","Descend","Ascend","Brake","Fire","Camera","Menu","Assist","Arm","Weapon","Gear","Roll left","Roll right"};
        static readonly string[] PadButtons={"buttonSouth","buttonEast","buttonWest","buttonNorth","leftShoulder","rightShoulder","leftTrigger","rightTrigger","select","start","leftStickPress","rightStickPress","dpad/up","dpad/down","dpad/left","dpad/right"};
        public PilotConfiguration config;
        public PilotInput()
        {
            try { config=JsonUtility.FromJson<PilotConfiguration>(PlayerPrefs.GetString(Preference,"")); } catch { }
            config??=new PilotConfiguration();config.axes??=new List<PilotAxis>();config.buttons??=new List<PilotButton>();
            foreach(var name in AxisNames)if(!config.axes.Exists(x=>x.action==name))config.axes.Add(new PilotAxis{action=name});
            foreach(var name in ButtonNames)if(!config.buttons.Exists(x=>x.action==name))config.buttons.Add(new PilotButton{action=name});
        }
        public void Save()=>PlayerPrefs.SetString(Preference,JsonUtility.ToJson(config));
        public void Reset(){PlayerPrefs.DeleteKey(Preference);config=new PilotInput().config;}
        public static string Identity(InputDevice device)=>string.IsNullOrWhiteSpace(device.description.product)?device.layout:device.description.product;
        public static string Relative(InputControl control)=>control.path.Substring(control.device.path.Length+1);
        public static InputDevice Find(string identity)
        {foreach(var d in InputSystem.devices)if(Identity(d)==identity)return d;return null;}
        public static Joystick RightStick
        {
            get {foreach(var j in Joystick.all)if(Identity(j).IndexOf("F14",StringComparison.OrdinalIgnoreCase)>=0)return j;
                foreach(var j in Joystick.all){string name=Identity(j);if(name.IndexOf("OT L",StringComparison.OrdinalIgnoreCase)<0&&name.IndexOf("rudder",StringComparison.OrdinalIgnoreCase)<0&&name.IndexOf("pedal",StringComparison.OrdinalIgnoreCase)<0&&j.stick.ReadValue().sqrMagnitude<.12f)return j;}return null;}
        }
        public static Joystick LeftStick
        {get {foreach(var j in Joystick.all)if(Identity(j).IndexOf("OT L",StringComparison.OrdinalIgnoreCase)>=0)return j;return null;}}
        static AxisControl Control(InputDevice d,string path)=>d?.TryGetChildControl<AxisControl>(path);
        public AxisControl AxisControl(PilotAxis binding)
        {
            if(binding.device=="none")return null;
            if(binding.device!="auto")return Control(Find(binding.device),binding.path);
            var pad=Gamepad.current;
            if(pad!=null)return binding.action switch {"Strafe"=>pad.leftStick.x,"Forward"=>pad.leftStick.y,"Pitch"=>pad.rightStick.y,"Yaw"=>pad.rightStick.x,_=>null};
            var left=LeftStick;var right=RightStick;
            return binding.action switch {"Strafe"=>left?.stick.x,"Forward"=>left?.stick.y,"Lift"=>left?.twist,"Pitch"=>right?.stick.y,"Yaw"=>right?.stick.x,"Roll"=>right?.twist,_=>null};
        }
        public ButtonControl ButtonControl(PilotButton binding)
        {
            if(binding.device=="none")return null;
            if(binding.device!="auto")return Find(binding.device)?.TryGetChildControl<ButtonControl>(binding.path);
            var pad=Gamepad.current;int index=Array.IndexOf(ButtonNames,binding.action);
            if(pad!=null&&index>=0)return pad.TryGetChildControl<ButtonControl>(PadButtons[index]);
            return binding.action=="Fire"?RightStick?.trigger:null;
        }
        public float Axis(string action)
        {
            if(!config.enabled)return 0;
            var binding=config.axes.Find(x=>x.action==action);var control=AxisControl(binding);if(control==null)return 0;
            float value=control.ReadValue()-binding.center;
            if(float.IsNaN(value)||float.IsInfinity(value)||Mathf.Abs(value)<=binding.deadzone)return 0;
            value=Mathf.Sign(value)*Mathf.Clamp01((Mathf.Abs(value)-binding.deadzone)/Mathf.Max(.01f,1-binding.deadzone));
            return Mathf.Clamp(value*binding.sensitivity*(binding.inverted?-1:1),-1,1);
        }
        public bool Held(string action)=>config.enabled&&ButtonControl(config.buttons.Find(x=>x.action==action))?.isPressed==true;
        public bool Down(string action)=>config.enabled&&ButtonControl(config.buttons.Find(x=>x.action==action))?.wasPressedThisFrame==true;
        public Vector3 Translation=>new Vector3(Axis("Strafe"),Axis("Lift")+(Held("Ascend")?1:0)-(Held("Descend")?1:0),Axis("Forward"));
        public Vector3 Rotation=>new Vector3(-Axis("Pitch")*(PlayerPrefs.GetInt("sp.padInvert",0)==1?-1:1),Axis("Yaw"),-Axis("Roll")+(Held("Roll left")?1:0)-(Held("Roll right")?1:0));
        public bool Neutral=>Translation.sqrMagnitude<.001f&&Rotation.sqrMagnitude<.001f&&!Held("Fire")&&!Held("Boost")&&!Held("Brake");
        public void Center()
        {foreach(var axis in config.axes){var control=AxisControl(axis);if(control!=null)axis.center=control.ReadValue();}Save();}
    }
}
