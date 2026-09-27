using UnityEngine;

namespace SpacePatriot
{
    public partial class FrontierWorld
    {
        // Walking and ship landing use the actual constructed floors. TrySurface
        // remains planet-only, so unpadded landings can still use the whole globe.
        readonly RaycastHit[] walkingHits = new RaycastHit[64];
        readonly Collider[] walkingObstacles = new Collider[64];
        readonly RaycastHit[] landingHits = new RaycastHit[64];

        public Vector3 WalkUp(Vector3 at)
        {
            Vector3 up = at - transform.TransformPoint(PlanetCenter);
            return up.sqrMagnitude > 1f ? up.normalized : transform.up;
        }

        public bool IsWalkDeck(Collider support)
        {
            if (!(support is BoxCollider) || !support.transform.IsChildOf(transform)) return false;
            switch (support.name)
            {
                case "Lift deck collision":
                case "Capital landing quay":
                case "Dock connection":
                case "Central utility boulevard":
                case "Public service square":
                case "Street connection":
                case "Survey field deck":
                    return true;
                case "Structural collision":
                    // The original port, outpost and orbital station use broad
                    // floor boxes. The hangar wall boxes are much taller.
                    return support.bounds.size.y <= 16.1f &&
                        support.bounds.size.x >= 20f && support.bounds.size.z >= 20f;
                default:
                    return false;
            }
        }

        // A landing deck must be a known structural floor, not a roof, prop or
        // the planet mesh beneath a city. Querying from above also tracks the
        // hangar lift after its collision surface moves.
        public bool TryLandingDeck(Vector3 near, float maxRise, float maxDrop,
            out Vector3 point, out Vector3 normal, out Collider support)
        {
            point = default;
            normal = transform.up;
            support = null;
            Vector3 up = transform.up;
            Ray ray = new Ray(near + up * (maxRise + .02f), -up);
            float reach = maxRise + maxDrop + .04f;
            Physics.SyncTransforms();
            int count = Physics.RaycastNonAlloc(ray, landingHits, reach,
                Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            RaycastHit[] hits = count == landingHits.Length
                ? Physics.RaycastAll(ray, reach, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore)
                : landingHits;
            if (count == landingHits.Length) count = hits.Length;
            float highest = -maxDrop - .01f;
            for (int i = 0; i < count; i++)
            {
                RaycastHit hit = hits[i];
                if (!IsWalkDeck(hit.collider) || Vector3.Dot(hit.normal, up) < .96f) continue;
                float rise = Vector3.Dot(hit.point - near, up);
                if (rise > maxRise + .01f || rise < -maxDrop - .01f || rise < highest) continue;
                highest = rise;
                point = hit.point;
                normal = hit.normal;
                support = hit.collider;
            }
            return support != null;
        }

        // All four gear-area corners must rest on level constructed floor. A
        // large vessel cannot be secured on a narrow street or off a quay edge.
        public bool LandingFootprintFits(Vector3 deckPoint, Quaternion attitude,
            float shipWidth, float shipLength)
        {
            Vector3 up = transform.up;
            Vector3 right = Vector3.ProjectOnPlane(attitude * Vector3.right, up).normalized;
            Vector3 forward = Vector3.ProjectOnPlane(attitude * Vector3.forward, up).normalized;
            if (right.sqrMagnitude < .5f || forward.sqrMagnitude < .5f) return false;
            float halfWidth = Mathf.Max(.8f, shipWidth * .42f);
            float halfLength = Mathf.Max(.8f, shipLength * .42f);
            for (int x = -1; x <= 1; x += 2)
                for (int z = -1; z <= 1; z += 2)
                {
                    Vector3 sample = deckPoint + right * (x * halfWidth) + forward * (z * halfLength) + up;
                    if (!TryLandingDeck(sample, .5f, 1.5f, out Vector3 gearPoint, out Vector3 normal, out _) ||
                        Mathf.Abs(Vector3.Dot(gearPoint - deckPoint, up)) > .35f ||
                        Vector3.Dot(normal, up) < .96f) return false;
                }
            return true;
        }

        public bool TryWalkSupport(Vector3 feet, float maxRise, float maxDrop,
            out Vector3 point, out Vector3 normal, out Collider support, bool deckOnly = false)
        {
            point = default;
            normal = WalkUp(feet);
            support = null;
            Vector3 up = normal;
            float reach = maxRise + maxDrop + .04f;
            Ray ray = new Ray(feet + up * (maxRise + .02f), -up);
            Physics.SyncTransforms();
            int count = Physics.RaycastNonAlloc(ray, walkingHits, reach,
                Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore);
            // A crowded building can fill the fixed buffer. Keep the nearest
            // eligible floor rather than relying on PhysX's unsorted first hits.
            RaycastHit[] hits = count == walkingHits.Length
                ? Physics.RaycastAll(ray, reach, Physics.DefaultRaycastLayers, QueryTriggerInteraction.Ignore)
                : walkingHits;
            if (count == walkingHits.Length) count = hits.Length;
            float highest = -maxDrop - .01f;
            for (int i = 0; i < count; i++)
            {
                RaycastHit hit = hits[i];
                if (!hit.collider || !hit.collider.transform.IsChildOf(transform)) continue;
                bool deck = IsWalkDeck(hit.collider);
                if (deckOnly && !deck) continue;
                if (Vector3.Dot(hit.normal, up) < .7f) continue; // slope over ~45 degrees
                float rise = Vector3.Dot(hit.point - feet, up);
                if (rise > maxRise + .01f || rise < -maxDrop - .01f) continue;
                if (support != null)
                {
                    bool selectedDeck = IsWalkDeck(support);
                    // The planet cap and port deck can be coplanar. Keep the
                    // constructed floor as the authoritative walk surface.
                    if (deck != selectedDeck && Mathf.Abs(rise - highest) < .25f)
                    { if (!deck) continue; }
                    else if (rise < highest) continue;
                }
                highest = rise;
                point = hit.point;
                normal = hit.normal;
                support = hit.collider;
            }
            if (support != null) return true;
            if (deckOnly) return false;
            // The planetary mesh can lag one frame behind the moving local
            // patch. Its radial query is safe only within the same step limits.
            if (!TrySurface(feet, out Vector3 terrain, out Vector3 terrainNormal)) return false;
            float terrainRise = Vector3.Dot(terrain - feet, up);
            if (terrainRise > maxRise || terrainRise < -maxDrop || Vector3.Dot(terrainNormal, up) < .7f)
                return false;
            point = terrain;
            normal = terrainNormal;
            support = planetCollider;
            return true;
        }

        public bool WalkClear(Vector3 feet, Vector3 up, Collider support)
        {
            const float radius = .32f;
            // A small sole gap avoids floor contact counting as a blocking wall.
            Vector3 bottom = feet + up * (radius + .06f);
            Vector3 top = feet + up * (1.75f - radius);
            int count = Physics.OverlapCapsuleNonAlloc(bottom, top, radius,
                walkingObstacles, ~0, QueryTriggerInteraction.Ignore);
            Collider[] obstacles = count == walkingObstacles.Length
                ? Physics.OverlapCapsule(bottom, top, radius, ~0, QueryTriggerInteraction.Ignore)
                : walkingObstacles;
            if (count == walkingObstacles.Length) count = obstacles.Length;
            for (int i = 0; i < count; i++)
            {
                Collider obstacle = obstacles[i];
                if (!obstacle || obstacle == support || obstacle == planetCollider ||
                    obstacle == streamedTerrainCollider) continue;
                // The first-person weapon is attached to the camera; it is not
                // world geometry and must never block its owner.
                FrontierGame game = FrontierGame.Instance;
                if (game != null && game.view != null &&
                    obstacle.transform.IsChildOf(game.view.transform)) continue;
                return false;
            }
            return true;
        }
    }
}
