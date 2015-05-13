class StatusCode
{
    public static get Ok(): number { return 200; }

    public static get NoContent(): number { return 204; }

    public static get BadRequest(): number { return 400; }

    public static get InternalServerError(): number { return 500; }
}

export = StatusCode;