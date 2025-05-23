// from https://raw.githubusercontent.com/agrueneberg/Spearson/gh-pages/lib/spearson.js
// archived: updates no longer accepted.  see new version of rank

(function (exports) {
    "use strict";

    var sort, round, min, max, range, sum, median, mean, deviation, variance, standardDeviation, standardize,
        rank, correlation, distance, pairwiseDistance, hierarchicalClustering, basestats;

 // @param {[number]} x Array of numbers.
    exports.sort = sort = function sortF(x) {
        var copy;
     // Copy array.
        copy = x.slice();
        return copy.sort(function copyF(a, b) {
            return a - b;
        });
    };

 // @param {number} x Number to round.
 // @param {number} [n] Number of decimal places.
    exports.round = round = function roundF(x, n) {
        n = typeof n === "number" ? n : 0;
        return Math.round(x * Math.pow(10, n)) / Math.pow(10, n);
    };

 // @param {[number]} x Array of numbers.
    exports.min = min = function minF(x) {
        var minn, i, n;
        minn = Infinity;
        for (i = 0, n = x.length; i < n; i++) {
            if (x[i] < minn) {
                minn = x[i];
            }
        }
        return minn;
    };

 // @param {[number]} x Array of numbers.
    exports.max = max = function maxF(x) {
        var maxx, i, n;
        maxx = -Infinity;
        for (i = 0, n = x.length; i < n; i++) {
            if (x[i] > maxx) {
                maxx = x[i];
            }
        }
        return maxx;
    };

 // @param {number} start Start value.
 // @param {number} stop Stop value.
    exports.range = range = function rangeF(start, stop) {
        var len, rangee, idx;
        len = stop - start;
        rangee = new Array(len);
        for (idx = 0; idx < len; idx++) {
            rangee[idx] = start++;
        }
        return rangee;
    };

 // @param {[number]} x Array of numbers.
    exports.sum = sum = function sumF(x) {
        var summ, i, n;
        summ = 0;
        for (i = 0, n = x.length; i < n; i++) {
            summ += x[i];
        }
        return summ;
    };

 // @param {[number]} x Array of numbers.
    exports.median = median = function medianF(x) {
        var sorted;
        if (x.length === 1) {
            return x[0];
        } else {
            sorted = sort(x);
            if (sorted.length % 2 === 0) {
                return mean([x[(sorted.length / 2) - 1], x[sorted.length / 2]]);
            } else {
                return x[Math.floor(sorted.length / 2)];
            }
        }
    };

 // @param {[number]} x Array of numbers.
    exports.mean = mean = function meanF(x) {
        return sum(x) / x.length;
    };

 // @param {[number]} x Array of numbers.
    exports.deviation = deviation = function deviationF(x) {
        var xBar, n, d, i;
        xBar = mean(x);
        n = x.length;
        d = new Array(n);
        for (i = 0; i < n; i++) {
            d[i] = x[i] - xBar;
        }
        return d;
    };

 // Calculates the variance.
 // @param {[number]} x Array of numbers.
 // @param {boolean} [bias] If true, the biased sample variance is used.
    exports.variance = variance = function varianceF(x, bias) {
        var d, i, n;
        bias = typeof bias === "boolean" ? bias : false;
        d = deviation(x);
        n = d.length;
        for (i = 0; i < n; i++) {
            d[i] = Math.pow(d[i], 2);
        }
        return sum(d) / (n - (bias === false ? 1 : 0));
    };

 // Calculates the sample standard deviation.
 // @param {[number]} x Array of numbers.
 // @param {boolean} [bias] If true, the biased sample variance is used.
    exports.standardDeviation = standardDeviation = function standardDeviationF(x, bias) {
        bias = typeof bias === "boolean" ? bias : false;
        return Math.sqrt(variance(x, bias));
    };

 // @param {[number]} x Array of numbers.
    exports.standardize = standardize = function standardizeF(x) {
        var sd, d, i, n;
        sd = standardDeviation(x);
        d = deviation(x);
        for (i = 0, n = d.length; i < n; i++) {
            d[i] = d[i] / sd;
        }
        return d;
    };

 // @param {[number]} x Array of numbers.
    exports.rankOLD = function rankOLDF(x) {
        var sorted, d, i, n;
        n = x.length;
        sorted = sort(x);
        d = new Array(n);
        for (i = 0; i < n; i++) {
            var rankk, first, last;
         // Handle tied ranks.
            first = sorted.indexOf(x[i]);
            last = sorted.lastIndexOf(x[i]);
            if (first === last) {
                rankk = first;
            } else {
                rankk = (first + last) / 2;
            }
         // Add 1 because ranks start with 1.
            d[i] = rankk + 1;
        }
        return d;
    };

    //function reduce() { return  s.reduce((c,x) => c = x > c ? x : c , -Infinity); }
    function reduce(s) {  // significantly faster then reduce above
        let c = -Infinity;
        for (let i=0; i<s.length; i++)
            if (s[i] > c) c  = s[i];
        return c;
    }


    exports.usei32 = true;
    exports.quickrank = function quickrankF(s, buckets=s.length * 3) {
        // notes.
        // Int32Array faster than Array.  Need different fills and setranks loop termination
        // This style of linked list much faster than 'obvious' growing arrays for each bucket.
        // Reduce as reduce slow.
        // Named internal functions to help interpret performance traces
        // Setranks is the dominant part, about 50% of total
        // Main test on lorbig (http://localhost:8800/csynth.html?startscript=CSynth/data/Lorentz/lorbig.js)
        // Warning test on CrickLots fails, array allocation failure.

        function fillinit() {
            const bucket = new Int32Array(buckets)
            const count = new Int32Array(buckets);
            bucket.fill(-1);
            return {bucket, count};
        }
        const {bucket, count} = fillinit();

        const maxx = reduce(s);
        const k = (buckets - 0.001) / maxx;
        const n = s.length;
        const next = new Int32Array(n);
        function fillbuckets() {
            for (let i = 0; i < n; i++) {
                const b = Math.floor(s[i] * k);
                next[i] = bucket[b];
                bucket[b] = i;
                count[b]++;
            }
        }
        fillbuckets();
        const ranks = new Array(n);  // do Not use typed array, upsets .map later
        function setranks() {
            let r = 1;
            for (let b = 0; b < buckets; b++) {
                const bn = count[b];
                if (bn) {
                    const rr = r + bn/2 - 1/2;
                    for (let i = bucket[b]; i !== -1; i = next[i])
                        ranks[i] = rr;
                    r += bn;
                }
            }
        }
        setranks();
        return ranks;
    }

    /** rank with buckets for bucket correlation */
    exports.bucketrank = function bucketrankF(s, buckets=20) {
        const maxx = reduce(s) * (1+ 0.01*buckets);
        const k = buckets/maxx;
        const hits = new Int32Array(buckets);
        s.forEach(v => hits[Math.floor(v*k)]++);
        const chits = new Int32Array(buckets+1);    // cumulative hits
        for (let i=1; i < chits.length; i++) chits[i] = chits[i-1] + hits[i-1];
        const r = s.map(v => {
            const b = Math.floor(v*k);
            const fr = v*k - b;
            return chits[b] + fr * hits[b];
        })
        return r;
    }

     // @param {[number]} x Array of numbers.
    exports.rank = rank = function rankF(x) {
        // return exports.rankOLD(x);
        // var sorted, d, i, n;
        const n = x.length;
        // // attempt to reduce garbage collection below made it slower (but ??? results inconsistent)
        // let sm = rank.sm;
        // if (sm && sm.length === n) {
        // } else {
        //     sm = new Array(n);
        //     for (let i=0; i<n; i++) sm[i] = [i,i];
        //     rank.sm = sm;
        // }
        // for (let i=0; i<n ;i++) {
        //     sm[i][0] = x[i];
        //     sm[i][1] = i;
        // }
        // const sorted = sm.sort((a, b) => a[0] - b[0]);  // sorted will be same as sm, but const may help

        function mapsort(xms) {
            function ss(a,b) { return a[0] - b[0]; }
            function sss(a,b) { return a[0] > b[0] ? 1 : a[0] === b[0] ? 0 : -1  ; }  // obtuse, not used
            function map(xm) {return xm.map((v,i) => [v,i]);}
            function sorti(xs) {return xs.sort(ss);}
            return sorti(map(xms));
        }

        function maked(sorted) {
            const d = new Array(n);

            for (let i = 0; i < n; i++) {
                const v = sorted[i][0];
                let j;
                for (j = i+1; j < n; j++) {
                    if (sorted[j][0] !== v) break;
                }

                // i is first, j-1 is last
                var rankk = (i + j - 1) / 2 + 1;  // +1 for rand starts 1
                for (let k = i; k < j; k++)
                    d[sorted[k][1]] = rankk;

                i = j-1;
            }
            return d;
        }

        const sorted = mapsort(x);
        const d = maked(sorted);
        return d;

    };

    exports.basestats = basestats = function basestatsF(a, b) {
        const n = a.length;
        if (n !== b.length) throw new Error('wrong lengths in basestats');
        let sx=0, sxx=0, sy=0, syy=0, sxy=0;
        for (let i=0; i<n; i++) {
            const x = a[i], y = b[i];
            sx += x;
            sxx += x*x;
            sy += y;
            syy += y*y;
            sxy += x*y;
        }
        return {n,sx,sy,sxx,syy,sxy};
    }

    exports.correl = function correlF(a, b) {
        const bs = ('sxx' in a) ? a : exports.basestats(a,b);
        const {n,sx,sy,sxx,syy,sxy} = bs;
        return (n*sxy - sx*sy) / Math.sqrt( (n * sxx - sx*sx) * (n * syy - sy*sy) );
    }


 // Calculates the correlation coefficient for two variables.
 // @param {[number]} x Array of numbers.
 // @param {[number]} y Array of numbers.
    exports.correlation = correlation = {
     // @param {boolean} [standardize] If false, x and y will not be standardized.
        pearson: exports.correl,
        oldpearson: function oldpearsonF(x, y, standardizee) {
            var n, d, i;
            standardizee = typeof standardizee === "boolean" ? standardizee : true;
            if (standardizee === true) {
                x = exports.standardize(x);
                y = exports.standardize(y);
            }
            n = x.length;
            d = new Array(n);
            for (i = 0; i < n; i++) {
                d[i] = x[i] * y[i];
            }
            return sum(d) / (n - 1);
        },
     // @param {boolean} [rank] If false, x and y will not be ranked.
        spearman: function spearmanF(xx, yy, rankk = true) {
            var xDeviation, yDeviation;
            // rankk = typeof rankk === "boolean" ? rankk : true;
            let x = xx, y = yy;
            if (rankk === true) {
                x = exports.rank(xx);
                y = exports.rank(yy);
            } else if (rankk === 'quick') {
                x = exports.quickrank(xx);
                y = exports.quickrank(yy);
            }
            return exports.correl(x,y);
        },
        bucket: function bucketF(x, y) {
            return exports.correl(exports.bucketrank(x),exports.bucketrank(y));
        }
    };

 // @param {[number]} x Array of numbers.
 // @param {[number]} y Array of numbers.
    exports.distance = distance = {
        euclidean: function euclideanF(x, y) {
            return Math.sqrt(sum(x.map(function (xi, i) {
                return Math.pow(xi - y[i], 2);
            })));
        },
        manhattan: function manhattanF(x, y) {
            return sum(x.map(function (xi, i) {
                return Math.abs(xi - y[i]);
            }));
        }
    };

 // @param {[[number]]} x Array of array of numbers.
 // @param {(x, y)} distanceMetric Distance metric.
 // TODO: Save memory by throwing away upper or lower triangle and diagonal.
    exports.pairwiseDistance = pairwiseDistance = function pairwiseDistanceF(x, distanceMetric) {
        var pairwiseDistances, distancee, i, j;
        pairwiseDistances = [];
        for (i = 0; i < x.length; i++) {
            pairwiseDistances[i] = [];
            for (j = 0; j <= i; j++) {
                if (i === j) {
                    pairwiseDistances[i][j] = 0;
                } else {
                    distancee = distanceMetric(x[i], x[j]);
                    pairwiseDistances[i][j] = distancee;
                    pairwiseDistances[j][i] = distancee;
                }
            }
        }
        return pairwiseDistances;
    };

 // @param {[[number]]} pairwiseDistances Pairwise distance matrix.
 // @param {string} linkage Linkage criterion.
 // Inspired by Heather Arthur's clusterfck: https://github.com/harthur/clusterfck
    exports.hierarchicalClustering = hierarchicalClustering = function hierarchicalClusteringF(pairwiseDistances, linkage) {
        var clusters, minDistance, clusterA, clusterB, distancee, distanceA,
            distanceB, candidates, mergedCluster, i, j;
        if (["single", "complete", "upgma"].indexOf(linkage) === -1) {
            throw new Error("The second argument (linkage) has to be either one of \"single\", \"complete\", or \"upgma\".");
        }
        clusters = [];
     // Initialize one cluster per observation.
        for (i = 0; i < pairwiseDistances.length; i++) {
            clusters.push({
                label: i,
                key: i,
                index: i,
                size: 1
            });
        }
        while (true) {
         // Stop if all clusters have been merged into a single cluster.
            if (clusters.length === 1) {
                delete clusters[0].index;
                delete clusters[0].key;
                break;
            }
         // Find closest clusters.
            minDistance = Infinity;
            for (i = 0; i < clusters.length; i++) {
                clusterA = clusters[i];
                for (j = 0; j < clusters.length; j++) {
                    if (i !== j) {
                        clusterB = clusters[j];
                        distancee = pairwiseDistances[clusterA.key][clusterB.key];
                        if (distancee < minDistance) {
                            minDistance = distancee;
                            candidates = [clusterA, clusterB];
                        }
                    }
                }
            }
         // Merge clusters.
            mergedCluster = {
                children: candidates,
                key: candidates[0].key,
                distance: minDistance,
                size: candidates[0].size + candidates[1].size
            };
         // Replace first cluster with merged cluster in list of clusters.
            clusters[candidates[0].index] = mergedCluster;
         // Remove second cluster from list of clusters.
            clusters.splice(candidates[1].index, 1);
         // Recompute distances from merged cluster to all other clusters.
            for (i = 0; i < clusters.length; i++) {
                if (clusters[i].key === candidates[0].key) {
                    distancee = 0;
                } else {
                    distanceA = pairwiseDistances[candidates[0].key][clusters[i].key];
                    distanceB = pairwiseDistances[candidates[1].key][clusters[i].key];
                    switch (linkage) {
                        case "single":
                            if (distanceA < distanceB) {
                                distancee = distanceA;
                            } else {
                                distancee = distanceB;
                            }
                            break;
                        case "complete":
                            if (distanceA > distanceB) {
                                distancee = distanceA;
                            } else {
                                distancee = distanceB;
                            }
                            break;
                        case "upgma":
                            distancee = ((distanceA * candidates[0].size) + (distanceB * candidates[1].size)) / (candidates[0].size + candidates[1].size);
                            break;
                    }
                }
                pairwiseDistances[candidates[0].key][clusters[i].key] = distancee;
                pairwiseDistances[clusters[i].key][candidates[0].key] = distancee;
            }
         // Remove column of second cluster from pairwise distance matrix.
            for (i = 0; i < pairwiseDistances.length; i++) {
                pairwiseDistances[i].splice(candidates[1].key, 1);
            }
         // Remove row of second cluster from pairwise distance matrix.
            pairwiseDistances.splice(candidates[1].key, 1);
         // Update keys of clusters to reflect removal of the column.
            for (i = candidates[1].key; i < clusters.length; i++) {
                clusters[i].key--;
            }
         // Remove obsolete key and index of merged clusters.
            delete candidates[0].key;
            delete candidates[0].index;
            delete candidates[1].key;
            delete candidates[1].index;
         // Reindex clusters.
            for (i = 0; i < clusters.length; i++) {
                clusters[i].index = i;
            }
        }
        return clusters;
    };

}(typeof exports === "undefined" ? this.spearson = {} : exports));
