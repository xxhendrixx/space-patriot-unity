using System;
using System.Collections.Generic;
using UnityEngine;
using UnityEngine.InputSystem;

namespace SpacePatriot
{
    [Serializable] public class KeyBinding { public string action; public Key key; public KeyBinding(string a,Key k){action=a;key=k;} }
    [Serializable] public class BindingList { public List<KeyBinding> entries; }
    public sealed class FlightBindings
    {
        public List<KeyBinding> entries;
        public FlightBindings()
        {
            entries=new List<KeyBinding>{new("Forward",Key.W),new("Reverse",Key.S),new("Strafe left",Key.A),new("Strafe right",Key.D),
                new("Ascend",Key.Space),new("Descend",Key.LeftCtrl),new("Roll left",Key.Q),new("Roll right",Key.E),
                new("Pitch up",Key.UpArrow),new("Pitch down",Key.DownArrow),new("Yaw left",Key.LeftArrow),new("Yaw right",Key.RightArrow),
                new("Boost",Key.LeftShift),new("Brake",Key.X),new("Board / leave seat",Key.F),new("Landing",Key.L),new("Gear",Key.G),
                new("Camera",Key.V),new("Horizon",Key.U),new("Jump",Key.H),new("Instruments",Key.Z),new("Power",Key.P),new("Assist",Key.T),
                new("Lights",Key.O),new("Cruise",Key.None),new("Arm weapons",Key.Y),new("Reload",Key.R),new("Target",Key.C),new("Shipyard",Key.K)};
            try { var saved=JsonUtility.FromJson<BindingList>(PlayerPrefs.GetString("sp.bindings","{}"));
                if(saved?.entries!=null)foreach(var row in saved.entries){var current=entries.Find(x=>x.action==row.action);if(current!=null&&row.key!=Key.None)current.key=row.key;}
            } catch { }
        }
        public Key KeyFor(string action)=>entries.Find(x=>x.action==action)?.key??Key.None;
        public bool Held(string action){var key=KeyFor(action);return key!=Key.None&&Keyboard.current!=null&&Keyboard.current[key].isPressed;}
        public bool Down(string action){var key=KeyFor(action);return key!=Key.None&&Keyboard.current!=null&&Keyboard.current[key].wasPressedThisFrame;}
        public float Axis(string negative,string positive)=>(Held(positive)?1:0)-(Held(negative)?1:0);
        public void Bind(string action,Key key)
        {
            var current=entries.Find(x=>x.action==action);if(current==null)return;
            var other=entries.Find(x=>x.key==key&&x!=current);if(other!=null)other.key=current.key;
            current.key=key;PlayerPrefs.SetString("sp.bindings",JsonUtility.ToJson(new BindingList{entries=entries}));PlayerPrefs.Save();
        }
    }
}
