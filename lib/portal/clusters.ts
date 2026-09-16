/**
 * Group specs into clusters via undirected related_specs edges (§10).
 */

export interface ClusterableSpec {
  id: string;
  relatedSpecs: string[];
}

export interface SpecCluster<T extends ClusterableSpec> {
  id: string;
  specs: T[];
}

export const clusterByRelatedSpecs = <T extends ClusterableSpec>(
  specs: T[]
): SpecCluster<T>[] => {
  const byId = new Map(specs.map((s) => [s.id, s]));
  const parent = new Map<string, string>();

  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p !== id) {
      const root = find(p);
      parent.set(id, root);
      return root;
    }
    return id;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const spec of specs) {
    if (!parent.has(spec.id)) parent.set(spec.id, spec.id);
  }

  for (const spec of specs) {
    for (const relatedId of spec.relatedSpecs) {
      if (byId.has(relatedId)) union(spec.id, relatedId);
    }
  }

  const groups = new Map<string, T[]>();
  for (const spec of specs) {
    const root = find(spec.id);
    const list = groups.get(root) ?? [];
    list.push(spec);
    groups.set(root, list);
  }

  return [...groups.entries()]
    .map(([id, members]) => ({
      id,
      specs: members.sort((a, b) => a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => {
      const aTitle = a.specs[0]?.id ?? a.id;
      const bTitle = b.specs[0]?.id ?? b.id;
      return aTitle.localeCompare(bTitle);
    });
};
