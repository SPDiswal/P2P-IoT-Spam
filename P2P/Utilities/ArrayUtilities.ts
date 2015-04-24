class ArrayUtilities
{
    public static equals<T>(first: Array<T>, second: Array<T>): boolean
    {
        if (!first || !second || first.length !== second.length) return false;

        for (var i = 0; i < this.length; i++)
        {
            if (first[i] instanceof Array && second[i] instanceof Array && !this.equals(<any>first[i], <any>second[i]))
            {
                return false;
            }
            else if (first[i].hasOwnProperty("equals"))
            {
                if (!(<any>first[i]).equals(second[i])) return false;
            }
            else
            {
                if (first[i] !== second[i]) return false;
            }
        }

        return true;
    }

    public static intersection<T>(first: Array<T>, second: Array<T>): Array<T>
    {
        return first.filter(value => (second.indexOf(value) !== -1));
    }
}

export = ArrayUtilities;