import request from '@/utils/request'

export function getTreeData2(query) {
  return request({
    url: '/api/tree/getTreeData2',
    method: 'get',
    params: query
  })
}
export function findLabelByName(query) {
  return request({
    url: '/api/tree/findLabelByName',
    method: 'get',
    params: query
  })
}

export function getLabelList(query) {
  return request({
    url: '/api/tree/getLabelList',
    method: 'get',
    params: query
  })
}
export function getDataInfoById(query) {
  return request({
    url: '/api/tree/getLabelList',
    method: 'get',
    params: query
  }) 
}
/* tree转化平级数组 */
export function treeToList(tree) {
  var queen = [];
  var out = [];
  queen = queen.concat(tree);
  while (queen.length) {
    var first = queen.shift();
    if (first.children) {
      queen = queen.concat(first.children);
      delete first["children"];
    }

    out.push(first);
  }
  return out;
}