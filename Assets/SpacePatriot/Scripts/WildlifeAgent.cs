using System.Collections.Generic;
using UnityEngine;

namespace SpacePatriot
{
    [RequireComponent(typeof(CapsuleCollider))]
    public sealed class WildlifeAgent : MonoBehaviour
    {
        static readonly List<WildlifeAgent> Active=new();
        public CreatureSpecies species;
        public float health;
        public bool dead;
        float think,attackTimer,roamAngle,windup;
        string pendingAbility="";
        Vector3 home;
        readonly List<Transform> gait=new();
        float phase;
        public float HealthFraction=>Mathf.Clamp01(health/Mathf.Max(1,species?.health??1));
        public static WildlifeAgent NearestBoss(Vector3 point,float radius)
        {
            WildlifeAgent result=null;float nearest=radius;
            for(int i=Active.Count-1;i>=0;i--){var a=Active[i];if(!a||a.dead||a.species==null||!a.species.Boss)continue;float d=Vector3.Distance(point,a.transform.position);if(d<nearest){nearest=d;result=a;}}
            return result;
        }
        public void Configure(FrontierGame game,CreatureSpecies data)
        {
            species=data;health=data.health;home=transform.position;phase=(data.seed%1000)*.012f;roamAngle=phase;
            transform.localScale=Vector3.one*(data.height/(data.Boss?(data.role=="apex"?2.4f:2.0f):1.85f));
            var capsule=GetComponent<CapsuleCollider>();capsule.center=new Vector3(0,.5f,0);capsule.radius=data.Boss?.8f:.42f;capsule.height=1.7f;
            foreach(var t in GetComponentsInChildren<Transform>())if(t.name.StartsWith("Gait "))gait.Add(t);
            var colors=new[]{Parse(data.palette,0),Parse(data.palette,1),Parse(data.palette,2)};int i=0;
            foreach(var renderer in GetComponentsInChildren<Renderer>()){var material=renderer.material;material.color=colors[(i+++(data.seed&3))%colors.Length];}
            if(!Active.Contains(this))Active.Add(this);
            name=data.name;
        }
        static Color Parse(string[] palette,int i)=>ColorUtility.TryParseHtmlString(palette!=null&&palette.Length>i?palette[i]:"#778078",out var c)?c:Color.gray;
        void OnDestroy(){Active.Remove(this);}
        void Update()
        {
            var game=FrontierGame.Instance;if(species==null||dead||game==null||!game.started||!game.walking||game.aboard||game.menu||game.dead)return;
            float dt=Mathf.Min(Time.deltaTime,.05f);think-=dt;attackTimer-=dt;phase+=dt*(1.2f+species.aggression*2);
            Vector3 player=game.WildlifeTarget;Vector3 delta=player-transform.position;float distance=delta.magnitude;
            bool hostile=species.aggression>.25f&&distance<species.detection;
            Vector3 direction;
            if(hostile)direction=distance>1?delta.normalized:transform.forward;
            else{if(think<=0){think=3+Mathf.Repeat(species.seed+Time.time,4);roamAngle+=Mathf.PI*(.55f+Mathf.Repeat(species.seed*.01f+Time.time,.85f));}direction=new Vector3(Mathf.Cos(roamAngle),0,Mathf.Sin(roamAngle));}
            float speed=hostile?(species.Boss?8.2f:5f):1.1f+Mathf.Repeat(species.seed*.001f,1.2f);
            if(!species.Boss&&distance<4&&!hostile)direction=-direction;
            if(!hostile&&Vector3.Distance(home,transform.position)>34)direction=(home-transform.position).normalized;
            if(species.biome!="gas"){
                Vector3 next=transform.position+direction*speed*dt;float surface=game.world.Height(next.x,next.z);next.y=surface;
                if(species.aggression>.25f&&distance<4&&attackTimer<=0){next+=Vector3.up*(species.Boss?2.2f:1.1f)*Mathf.Sin(Mathf.Clamp01((attackTimer+.3f)/.3f)*Mathf.PI);}
                transform.position=next;
            }else{
                Vector3 next=transform.position+direction*speed*dt;next.y=game.world.Deck+Mathf.Sin(phase*.65f+species.seed)*2.2f;transform.position=next;
            }
            if(direction.sqrMagnitude>.01f){var target=Quaternion.LookRotation(direction,Vector3.up);transform.rotation=Quaternion.Slerp(transform.rotation,target,dt*(hostile?5:1.2f));}
            for(int i=0;i<gait.Count;i++)gait[i].localRotation=Quaternion.Euler(Mathf.Sin(phase*3+(i%2)*Mathf.PI)*17,0,0);
            if(windup>0){windup-=dt;if(windup<=0){float reach=species.Boss?72:3.3f;if(distance<reach)game.WildlifeAttack(this,species.damage,pendingAbility,distance);pendingAbility="";}}
            if(hostile&&attackTimer<=0&&windup<=0&&distance<(species.Boss?85:3.3f))
            {
                attackTimer=species.Boss?3.8f:2.1f;pendingAbility=species.abilities!=null&&species.abilities.Length>0?species.abilities[Mathf.Abs(Mathf.FloorToInt(Time.time/4)+species.seed)%species.abilities.Length]:"claw strike";
                if(species.Boss){windup=1.15f;game.WildlifeWarning(species,pendingAbility);}
                else if(distance<3.3f)game.WildlifeAttack(this,species.damage,pendingAbility,distance);
            }
        }
        public void Hit(float amount)
        {
            if(dead||amount<=0)return;health-=amount;
            if(health<=0){health=0;dead=true;var game=FrontierGame.Instance;if(game!=null)game.WildlifeDefeated(this);foreach(var c in GetComponentsInChildren<Collider>())c.enabled=false;foreach(var r in GetComponentsInChildren<Renderer>())r.enabled=false;Destroy(gameObject,2f);}
        }
    }
}
