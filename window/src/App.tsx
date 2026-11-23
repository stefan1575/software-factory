import { useState } from 'react';
import type { NonEmpty, Picture } from '../../src/picture.ts';
import { Main } from './Pages.tsx';
import type { Project } from './samples.ts';
import { firstPlace, findPlace, type Place } from './places.ts';
import { Sidebar } from './Sidebar.tsx';

export function App({ projects }: { readonly projects: NonEmpty<Project> }) {
  const [project, setProject] = useState(projects[0]);
  const [closedEfforts, setClosedEfforts] = useState(false);
  const [chosen, setChosen] = useState<Place>(() => firstPlace(projects[0].picture));
  const place = showable(project.picture, chosen, closedEfforts);

  return (
    <div className="flex h-full">
      <Sidebar
        projects={projects}
        project={project}
        onProject={(next) => {
          setProject(next);
          setChosen(firstPlace(next.picture));
        }}
        place={place}
        onPlace={setChosen}
        closedEfforts={closedEfforts}
        onClosedEfforts={setClosedEfforts}
      />
      <Main key={`${project.name} ${JSON.stringify(place)}`} picture={project.picture} place={place} closedEfforts={closedEfforts} onPlace={setChosen} />
    </div>
  );
}

/** Hiding closed efforts must not leave a hidden one on screen. */
function showable(picture: Picture, place: Place, closedEfforts: boolean): Place {
  if (place.kind !== 'effort' || closedEfforts) return place;
  return findPlace(picture, place.number, closedEfforts) === null ? firstPlace(picture) : place;
}
