class ArrayUtilities
{
    public static nonNull<T>(array: Array<T>): Array<T>
    {
        return array.filter(value => !!value);
    }

    public static distinct<T>(array: Array<T>): Array<T>
    {
        return array.filter((value, index) => ArrayUtilities.indexOfWithEquals(array, value) === index);
    }

    public static equals<T>(first: Array<T>, second: Array<T>): boolean
    {
        if (!first || !second || first.length !== second.length) return false;

        for (var i = 0; i < first.length; i++)
        {
            if (first[i] instanceof Array && second[i] instanceof Array && !this.equals(<any>first[i], <any>second[i]))
                return false;
            else if ((first[i].hasOwnProperty("equals") || first[i].constructor.prototype.hasOwnProperty("equals")))
            {
                if (!(<any>first[i]).equals(second[i])) return false;
                else
                if (first[i] !== second[i]) return false;
            }
        }

        return true;
    }

    public static find<T>(array: Array<T>, predicate: (element: T) => boolean): T
    {
        for (var i = 0; i < array.length; i++)
            if (predicate(array[i])) return array[i];

        return null;
    }

    public static contains<T>(array: Array<T>, element: T): boolean
    {
        return this.indexOfWithEquals(array, element) >= 0;
    }

    public static flatten<T>(array: Array<Array<T>>): Array<T>
    {
        return (<Array<T>>[ ]).concat.apply(<Array<T>>[ ], array);
    }

    public static union<T>(first: Array<T>, second: Array<T>): Array<T>
    {
        return this.distinct(first.concat(second));
    }

    public static intersection<T>(first: Array<T>, second: Array<T>): Array<T>
    {
        return first.filter(value => (ArrayUtilities.indexOfWithEquals(second, value) !== -1));
    }

    public static except<T>(first: Array<T>, second: Array<T>): Array<T>
    {
        return first.filter(value => (ArrayUtilities.indexOfWithEquals(second, value) === -1));
    }

    public static disjoint<T>(first: Array<T>, second: Array<T>): boolean
    {
        return ArrayUtilities.intersection(first, second).length === 0;
    }

    public static indexOfWithEquals<T>(array: Array<T>, value: T): number
    {
        for (var i = 0; i < array.length; i++)
        {
            if (array[i] === null) continue;
            if (((array[i].hasOwnProperty("equals")
                    || array[i].constructor.prototype.hasOwnProperty("equals"))
                && (<any>array[i]).equals(value)) || array[i] === value)
                return i;
        }

        return -1;
    }
}

export = ArrayUtilities;