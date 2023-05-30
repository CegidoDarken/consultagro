var apriori = require("node-apriori");

var transactions = [
    ["pan", "leche", "huevos"],
    ["arroz", "leche", "manzanas"],
    ["pan", "arroz", "leche", "manzanas"],
    ["arroz", "manzanas","uvas"],
    ["pan", "arroz", "leche", "manzanas"],
    ["pan", "arroz", "leche","uvas"],
    ["pan", "arroz", "leche"]
];

var aprioriAlgo = new apriori.Apriori(0.6);
console.log(`Ejecutando Apriori...`);

aprioriAlgo.on('data', function (itemset) {
    var support = itemset.support;
    var items = itemset.items;
    console.log(`Conjunto { ${items.join(', ')} } es frecuente y tiene un apoyo de ${support}`);
});

aprioriAlgo.exec(transactions)
    .then(function (result) {
        var frequentItemsets = result.itemsets;
        console.log(`Finished executing Apriori. ${frequentItemsets.length} frequent itemsets were found.`);
        var recommendations = generateRecommendations(frequentItemsets);
        console.log("Recomendaciones:");
        recommendations.forEach(function (recommendation, index) {
            console.log(`- ${recommendation}`);
        });
    });

function generateRecommendations(itemsets) {
    itemsets.sort(function (a, b) {
        return b.support - a.support;
    });
    var recommendations = [];
    var recommendationSet = new Set();
    for (var i = 0; i < itemsets.length; i++) {
        var itemset = itemsets[i];
        if (itemset.items.length > 0 && !recommendationSet.has(itemset.items[0])) {
            recommendations.push(itemset.items[0]);
            recommendationSet.add(itemset.items[0]);
        }
    }

    return recommendations;
}
