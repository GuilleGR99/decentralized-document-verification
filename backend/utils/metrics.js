export async function measureTime(fn) {
    const start = performance.now();

    try {
        const result = await fn();
        const end = performance.now();

        return {
            result,
            time: end - start
        };
    } catch (error) {
        const end = performance.now();

        return {
            error,
            time: end - start
        };
    }
}

export async function measureTimeOnly(fn) {
    const start = performance.now();

    try {
        await fn();
        const end = performance.now();

        return end - start;
    } catch (error) {
        const end = performance.now();

        return end - start;
    }
}