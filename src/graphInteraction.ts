import * as d3 from 'd3';
import * as dagreD3 from 'dagre-d3-es';

type NodeId = string | number;

interface IGraphData {
  nodes: Array<{
    id: NodeId;
    name: NodeId;
  }>;
  edges: Array<{
    source: NodeId;
    target: NodeId;
  }>;
}

interface INodeMap {
  [key: NodeId]: {
    name: NodeId;
    inDegree: number;
    signal: number;
    state: 0 | 1;
    clickRoot: Set<NodeId>;
  };
}

interface IAdjMap {
  [key: NodeId]: Set<NodeId>;
}

function createGraph(data: IGraphData) {
  const nodes = data['nodes'];
  const edges = data['edges'];
  const nodeMap: INodeMap = {};
  const adjMap: IAdjMap = {};
  nodes.forEach((node) => {
    const id = node['id'];
    const name = node['name'];
    adjMap[id] = new Set();
    nodeMap[id] = {
      name: name,
      inDegree: 0,
      signal: 0,
      state: 0, // 0: visible / 1: hidden
      clickRoot: new Set(),
    };
  });
  edges.forEach((edge) => {
    const sourceNode = edge['source'];
    const targetNode = edge['target'];
    adjMap[sourceNode].add(targetNode);
    nodeMap[targetNode]['inDegree']++;
  });
  return { nodeMap, adjMap };
}

function updateElements(clickNodeId: NodeId, nodeMap: INodeMap, adjMap: IAdjMap) {
  const updateNodes: Array<NodeId> = [];
  const updateEdges: Array<Array<NodeId>> = [];
  const traverseQueue: Array<NodeId> = [];
  const visitNodeMap: { [key: NodeId]: 0 | 1 } = {};
  for (const node in nodeMap) {
    visitNodeMap[node] = 0;
  }
  traverseQueue.push(clickNodeId);
  visitNodeMap[clickNodeId] = 1;
  const executeClose = !nodeMap[clickNodeId]['clickRoot'].has(clickNodeId) && nodeMap[clickNodeId]['state'] == 0;
  while (traverseQueue.length > 0) {
    const currentNode = traverseQueue.shift() as NodeId;
    if (executeClose) {
      if (currentNode == clickNodeId || nodeMap[currentNode]['signal'] === nodeMap[currentNode]['inDegree']) {
        nodeMap[currentNode]['clickRoot'].add(clickNodeId);
        updateNodes.push(currentNode);
        if (currentNode !== clickNodeId) {
          nodeMap[currentNode]['state'] = 1;
        }
        // skip previously collapsed nodes
        if (currentNode !== clickNodeId && nodeMap[currentNode]['clickRoot'].has(currentNode)) {
          continue;
        }
        for (const child of adjMap[currentNode]) {
          nodeMap[child]['signal']++;
          updateEdges.push([currentNode, child]);
          if (visitNodeMap[child] === 0) {
            visitNodeMap[child] = 1;
            traverseQueue.push(child);
          }
        }
      }
    } else {
      nodeMap[currentNode]['clickRoot'].delete(clickNodeId);
      if (currentNode != clickNodeId && nodeMap[currentNode]['state'] === 0) {
        continue;
      }
      nodeMap[currentNode]['state'] = 0;
      updateNodes.push(currentNode);
      // skip previously collapsed child nodes
      if (nodeMap[currentNode]['clickRoot'].has(currentNode)) {
        continue;
      }
      for (const child of adjMap[currentNode]) {
        if (nodeMap[child]['signal'] > 0) {
          nodeMap[child]['signal']--;
        }
        updateEdges.push([currentNode, child]);
        if (visitNodeMap[child] === 0) {
          visitNodeMap[child] = 1;
          traverseQueue.push(child);
        }
      }
    }
  }

  updateNodes.forEach((nodeId) => {
    if (nodeId === clickNodeId) {
      d3.select(`g.node#node${nodeId}`)
        .select('circle')
        .style('fill', executeClose ? '#ee6666' : '#bdd2fd');
    } else {
      d3.select(`g.node#node${nodeId}`)
        .classed(executeClose ? 'fade-in' : 'fade-out', false)
        .classed(executeClose ? 'fade-out' : 'fade-in', true);
    }
  });

  updateEdges.forEach((edge) => {
    const source = edge[0];
    const target = edge[1];
    d3.select(`#s${source}t${target}`)
      .classed(executeClose ? 'fade-in' : 'fade-out', false)
      .classed(executeClose ? 'fade-out' : 'fade-in', true);
  });
}

function renderGraph(g: dagreD3.graphlib.Graph, nodeMap: INodeMap, adjMap: IAdjMap) {
  const svg = d3.select('svg');
  const inner = svg.append('g');
  const zoom = d3.zoom().on('zoom', ({ transform }) => {
    inner.attr('transform', transform);
  });
  svg.call(zoom as any);
  for (const node in nodeMap) {
    g.setNode(node, {
      id: `node${node}`,
      nodeId: node,
      label: nodeMap[node]['name'],
      width: 50,
      shape: 'circle',
      style: 'stroke: #699cff; fill: #bdd2fd; stroke-width: 1px; cursor: pointer',
      labelStyle: "font: 20px 'Helvetica Neue', Helvetica; fill: black;",
    });
  }
  for (const source in adjMap) {
    for (const target of adjMap[source]) {
      g.setEdge(source, target, {
        id: `s${source}t${target}`,
        curve: d3.curveBasis,
        style: 'stroke: gray; fill:none; stroke-width: 2px;',
        arrowheadStyle: 'fill: gray',
      });
    }
  }
  const render = new (dagreD3 as any).render();
  render(inner, g);
  const xCenterOffset = ((svg.attr('width') as any) - g.graph().width) / 2;
  const yCenterOffset = ((svg.attr('height') as any) - g.graph().height) / 2;
  inner.attr('transform', `translate(${xCenterOffset}, ${yCenterOffset})`);
  svg.selectAll('g.node').on('click', function () {
    const clickId = parseInt((this as any).id.match(/\d+/)[0]);
    updateElements(clickId, nodeMap, adjMap);
  });
}

export function app(inputData: string) {
  d3.json(inputData).then((data) => {
    const g = new dagreD3.graphlib.Graph({ directed: true });
    g.setGraph({});
    g.graph().rankdir = 'TB';
    const { nodeMap, adjMap } = createGraph(data as IGraphData);
    renderGraph(g, nodeMap, adjMap);
  });
}
