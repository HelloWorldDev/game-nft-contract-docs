/*
注意：我们使用的rpc是helius， method: "getAssetsByOwner"，
如果不用helius，查找方法建议去文档中查找。
*/

// BUY: 获取当前池子内剩余nft
export const getAssetsByPool = async (address) => {
    let url = "rpc url";
    let address = "bonding_curve"; // 池子地址
    return await axios(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: address,
            method: "getAssetsByOwner",
            params: {
                ownerAddress: address,
                page: tablePage.value.pageNum, // 页码
                limit: 1000,
            },
        }),
    });
};

// SELL: 获取当前用户在链上拥有的所有nft，不局限于一个nft集合（需要自己筛选）
export const getAssetsByOwner = async () => {
    let url = "rpc url";
    let address = "owner钱包地址";
    return await axios(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            jsonrpc: "2.0",
            id: address,
            method: "getAssetsByOwner",
            params: {
                ownerAddress: address,
                page: tablePage.value.pageNum, // 页码
                limit: 1000,
            },
        }),
    });
};

/*
结果示例：
const result = {
    items: [
        {
            // ...
            grouping: [
                {
                    group_key: "collection",
                    group_value: "46BCiee2T3UJZBuagYZUCi28XBFHNDeRno793ag99bco", // 当前nft的集合mint
                },
            ],
            id: "J5kMAc6LL5864xqjauXkYPZFD2XEmVEXQ7cWsUTFEpMc", // NFT asset id
            // ...
        },
    ],
    limit: 1000,
    page: 1,
    total: 135,
};
*/
