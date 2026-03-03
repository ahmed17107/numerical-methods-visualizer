import sympy as sp

def convert_to_gx(equation_str):

    x = sp.symbols('x')

    f = sp.sympify(equation_str)
    poly = sp.Poly(f, x)

    degree = poly.degree()
    a = poly.coeff_monomial(x**degree)

    if a < 0:
        f = -f
        poly = sp.Poly(f, x)
        a = poly.coeff_monomial(x**degree)

    rest = f - a * x**degree

    right_side = sp.N((-rest)/a, 3)  

    if degree == 2:
        g = sp.sqrt(right_side)
    else:
        g = right_side ** (1/degree)

    print("\nFinal g(x):")
    print("x =", g)


eq = input("Enter equation in x: ")
convert_to_gx(eq)