/**
 * Implementación optimizada del algoritmo Quicksort en JavaScript
 * Complejidad temporal: O(n log n) promedio, O(n²) peor caso
 * Complejidad espacial: O(log n) promedio
 */

/**
 * Función principal de Quicksort
 * @param {Array} arr - Array a ordenar
 * @returns {Array} - Array ordenado
 */
function quicksort(arr) {
    // Caso base: arrays de 0 o 1 elemento ya están ordenados
    if (arr.length <= 1) {
        return arr;
    }
    
    // Seleccionar el pivote (usando el elemento del medio para mejor rendimiento)
    const pivotIndex = Math.floor(arr.length / 2);
    const pivot = arr[pivotIndex];
    
    // Dividir el array en elementos menores, iguales y mayores al pivote
    const left = [];
    const equal = [];
    const right = [];
    
    for (let i = 0; i < arr.length; i++) {
        if (arr[i] < pivot) {
            left.push(arr[i]);
        } else if (arr[i] === pivot) {
            equal.push(arr[i]);
        } else {
            right.push(arr[i]);
        }
    }
    
    // Recursivamente ordenar las subarrays y combinar los resultados
    return [...quicksort(left), ...equal, ...quicksort(right)];
}

/**
 * Versión in-place de Quicksort (más eficiente en memoria)
 * @param {Array} arr - Array a ordenar
 * @param {number} low - Índice inicial (por defecto 0)
 * @param {number} high - Índice final (por defecto arr.length - 1)
 */
function quicksortInPlace(arr, low = 0, high = arr.length - 1) {
    if (low < high) {
        const pivotIndex = partition(arr, low, high);
        quicksortInPlace(arr, low, pivotIndex - 1);
        quicksortInPlace(arr, pivotIndex + 1, high);
    }
    return arr;
}

/**
 * Función auxiliar para particionar el array
 * @param {Array} arr - Array a particionar
 * @param {number} low - Índice inicial
 * @param {number} high - Índice final
 * @returns {number} - Índice del pivote
 */
function partition(arr, low, high) {
    // Usar el último elemento como pivote
    const pivot = arr[high];
    let i = low - 1;
    
    for (let j = low; j < high; j++) {
        if (arr[j] <= pivot) {
            i++;
            // Intercambiar elementos
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
    }
    
    // Colocar el pivote en su posición correcta
    [arr[i + 1], arr[high]] = [arr[high], arr[i + 1]];
    return i + 1;
}

/**
 * Función de utilidad para ordenar arrays de objetos por una propiedad específica
 * @param {Array} arr - Array de objetos a ordenar
 * @param {string} key - Propiedad por la cual ordenar
 * @param {boolean} ascending - Orden ascendente (true) o descendente (false)
 * @returns {Array} - Array ordenado
 */
function quicksortByKey(arr, key, ascending = true) {
    if (arr.length <= 1) {
        return arr;
    }
    
    const pivotIndex = Math.floor(arr.length / 2);
    const pivot = arr[pivotIndex][key];
    
    const left = [];
    const equal = [];
    const right = [];
    
    for (let i = 0; i < arr.length; i++) {
        const comparison = arr[i][key] < pivot ? -1 : arr[i][key] > pivot ? 1 : 0;
        if (comparison < 0) {
            left.push(arr[i]);
        } else if (comparison === 0) {
            equal.push(arr[i]);
        } else {
            right.push(arr[i]);
        }
    }
    
    const sortedLeft = quicksortByKey(left, key, ascending);
    const sortedRight = quicksortByKey(right, key, ascending);
    
    return ascending 
        ? [...sortedLeft, ...equal, ...sortedRight]
        : [...sortedRight, ...equal, ...sortedLeft];
}

// Ejemplos de uso
console.log('=== Ejemplos de Quicksort ===');

// Ejemplo 1: Array simple
const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log('Original:', numbers);
console.log('Ordenado:', quicksort([...numbers]));

// Ejemplo 2: Versión in-place
const numbers2 = [64, 34, 25, 12, 22, 11, 90];
console.log('Original (in-place):', numbers2);
quicksortInPlace(numbers2);
console.log('Ordenado (in-place):', numbers2);

// Ejemplo 3: Array de objetos
const users = [
    { name: 'Ana', age: 25 },
    { name: 'Carlos', age: 30 },
    { name: 'Beatriz', age: 22 },
    { name: 'David', age: 28 }
];
console.log('Original (objetos):', users);
console.log('Ordenado por edad:', quicksortByKey([...users], 'age'));
console.log('Ordenado por nombre:', quicksortByKey([...users], 'name'));

// Ejemplo 4: Array con duplicados
const duplicates = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3, 5];
console.log('Original (con duplicados):', duplicates);
console.log('Ordenado:', quicksort([...duplicates]));

module.exports = {
    quicksort,
    quicksortInPlace,
    quicksortByKey,
    partition
};
